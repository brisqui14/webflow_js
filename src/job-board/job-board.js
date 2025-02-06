const JobBoard = {
    // State management
    state: {
      currentPage: 1,
      isLoading: false,
      hasMore: true,
      totalResults: 0,
      filters: {
        title: '',
        locationTypes: [],
        workTypes: []
      }
    },

    updateResultsCount() {
      const resultsCounter = document.getElementById('results-counter');
      if (resultsCounter) {
        resultsCounter.textContent = `${this.state.totalResults} ${this.state.totalResults === 1 ? 'job' : 'jobs'} found`;
      }
    },
 
    setupFilters() {
      // Location Type checkboxes
      const locationTypeIds = ['wtoscb', 'wtrecb', 'wthycb', 'wtnscb'];
      const locationTypeValues = ['On-Site', 'Remote', 'Hybrid', 'Not Specified'];
     
      locationTypeIds.forEach((id, index) => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
          checkbox.addEventListener('change', () => {
            const value = locationTypeValues[index];
            if (checkbox.checked) {
              this.state.filters.locationTypes.push(value);
            } else {
              this.state.filters.locationTypes = this.state.filters.locationTypes
                .filter(type => type !== value);
            }
            this.refreshJobs();
          });
        }
      });
 
      // Work Type checkboxes
      const workTypeIds = ['etftcb', 'etptcb', 'etcocb', 'etsecb', 'etlecb', 'etnscb'];
      const workTypeValues = ['Full-Time', 'Part-Time', 'Contract', 'Seasonal',
                             'Learning Experience Opportunity', 'Not Specified'];
     
      workTypeIds.forEach((id, index) => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
          checkbox.addEventListener('change', () => {
            const value = workTypeValues[index];
            if (checkbox.checked) {
              this.state.filters.workTypes.push(value);
            } else {
              this.state.filters.workTypes = this.state.filters.workTypes
                .filter(type => type !== value);
            }
            this.refreshJobs();
          });
        }
      });
 
      // Search input and button
      const searchInput = document.getElementById('search_input');
      const searchButton = document.getElementById('search_button');
 
      if (searchInput && searchButton) {
        searchButton.addEventListener('click', () => {
          this.state.filters.title = searchInput.value;
          this.refreshJobs();
        });
 
        searchInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.state.filters.title = searchInput.value;
            this.refreshJobs();
          }
        });
      }
    },
 
    async fetchJobs() {
      if (this.state.isLoading || !this.state.hasMore) return;
      this.state.isLoading = true;
 
      try {
        const { data: jobsData, error: jobsError } = await window.supabase
          .from('production_jobs')
          .select(`
            *,
            production_companies (
              company_id,
              name,
              company_url,
              logo_url
            )
          `)
          .order('created_at', { ascending: false });
 
        if (jobsError) throw jobsError;

        // Apply filters
        let filteredData = jobsData;
        
        if (this.state.filters.title) {
          filteredData = filteredData.filter(job => 
            job.title.toLowerCase().includes(this.state.filters.title.toLowerCase())
          );
        }
 
        if (this.state.filters.locationTypes.length > 0) {
          filteredData = filteredData.filter(job =>
            job.processed_location_types?.some(type => 
              this.state.filters.locationTypes.includes(type)
            )
          );
        }
 
        if (this.state.filters.workTypes.length > 0) {
          filteredData = filteredData.filter(job =>
            job.processed_work_types?.some(type => 
              this.state.filters.workTypes.includes(type)
            )
          );
        }
 
        // Filter out duplicates
        const seen = new Set();
        const uniqueJobs = [];
        for (const job of filteredData) {
          if (!seen.has(job.company_id)) {
            uniqueJobs.push(job);
            seen.add(job.company_id);
          }
        }
 
        // Update total results count
        this.state.totalResults = uniqueJobs.length;
        this.updateResultsCount();

        // Clear existing jobs when applying new filters
        const jobsContainer = document.querySelector('#job-listings-container');
        const template = jobsContainer.querySelector('.job-listing');
        if (template) {
          template.style.display = 'none';
        }
       
        // Clear existing jobs except template
        while (jobsContainer.children.length > 1) {
          jobsContainer.removeChild(jobsContainer.lastChild);
        }
 
        // Render new jobs
        for (const job of uniqueJobs) {
          const jobElement = await this.createJobElement(job);
          jobsContainer.appendChild(jobElement);
        }
 
        this.state.hasMore = false;
 
      } catch (err) {
        console.error('Error loading jobs:', err);
        this.state.totalResults = 0;
        this.updateResultsCount();
      } finally {
        this.state.isLoading = false;
      }
    },

    async createJobElement(job) {
      // Create new job listing element
      const element = document.createElement('div');
      element.className = 'job-listing';
      element.innerHTML = `
        <h3 class="job-title"></h3>
        <p class="job-company-location">
          <span class="job-company"></span> - <span class="job-location"></span>
        </p>
      `;
      
      // Set job details
      element.querySelector('.job-title').textContent = job.title;
      element.querySelector('.job-company').textContent = job.production_companies?.name || '';
      
      // Get formatted address
      const locationSpan = element.querySelector('.job-location');
      locationSpan.textContent = 'Loading location...';
      
      try {
        if (job.processed_locations && job.processed_locations.length > 0) {
          const { data: locations } = await window.supabase
            .from('structured_locations')
            .select('formatted_address')
            .in('place_id', job.processed_locations)
            .limit(1);

          locationSpan.textContent = locations?.[0]?.formatted_address || 'Location not specified';
        } else {
          locationSpan.textContent = 'Location not specified';
        }
      } catch (err) {
        console.error('Error fetching location:', err);
        locationSpan.textContent = 'Location not specified';
      }
      
      // Make the entire job listing clickable
      element.style.cursor = 'pointer';
      element.addEventListener('click', () => {
        this.showJobDetails(job);
      });

      return element;
    },

    async showJobDetails(job) {
      const detailContainer = document.getElementById('job-detail-container');
      const titleElement = detailContainer.querySelector('.job-detail-title');
      const contentElement = detailContainer.querySelector('.job-detail-content');
     
      // Show loading state
      titleElement.textContent = 'Loading...';
      contentElement.innerHTML = '<div class="loading-spinner"></div>';
      detailContainer.classList.add('job-detail-visible');
      document.querySelector('.job-board-container').classList.add('show-detail');
 
      try {
        // Get location data
        let locationAddress = 'Location not specified';
        if (job.processed_locations && job.processed_locations.length > 0) {
          const { data: locations } = await window.supabase
            .from('structured_locations')
            .select('formatted_address')
            .in('place_id', job.processed_locations)
            .limit(1);

          if (locations && locations.length > 0) {
            locationAddress = locations[0].formatted_address;
          }
        }
 
        // Update content
        titleElement.textContent = job.title;
       
        // Create content HTML
        const contentHTML = `
          <div class="job-company-header">
            ${job.production_companies?.logo_url ?
              `<img src="${job.production_companies.logo_url}"
               alt="${job.production_companies.name}"
               class="company-logo">` : ''
            }
            <div class="company-info">
              <h3>${job.production_companies?.name || ''}</h3>
              <p class="company-details">
                ${[
                  job.department,
                  job.team,
                  locationAddress
                ].filter(Boolean).join('; ')}
              </p>
            </div>
            ${job.job_url ? 
              `<a href="${job.job_url}" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="apply-button">
                Apply Now
              </a>` : ''
            }
          </div>
          <div class="job-tags">
            ${(job.processed_work_types || [])
              .map(type => `<span class="job-tag">${type}</span>`)
              .join('')
            }
          </div>
          <div class="job-description">
            ${job.description || ''}
          </div>
        `;
       
        contentElement.innerHTML = contentHTML;
 
      } catch (error) {
        console.error('Error loading job details:', error);
        contentElement.innerHTML = `<div class="error-message">
          Error loading job details: ${error.message}
        </div>`;
      }
    },
 
    refreshJobs() {
      const jobsContainer = document.querySelector('#job-listings-container');
      if (jobsContainer) {
        this.state.hasMore = true;
        this.fetchJobs();
      }
    },
 
    setupInfiniteScroll() {
      const options = {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
      };
 
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.state.isLoading) {
            this.fetchJobs();
          }
        });
      }, options);
 
      const sentinel = document.createElement('div');
      sentinel.id = 'infinite-scroll-sentinel';
      document.querySelector('#job-listings-container').appendChild(sentinel);
      observer.observe(sentinel);
    },
 
    init() {
      const jobsContainer = document.querySelector('#job-listings-container');
      if (!jobsContainer) {
        console.error('Job listings container not found');
        return;
      }

      // Add results counter to the DOM
      const resultsCounter = document.createElement('div');
      resultsCounter.id = 'results-counter';
      resultsCounter.className = 'results-counter';
      jobsContainer.insertBefore(resultsCounter, jobsContainer.firstChild);

      this.setupFilters();
      this.fetchJobs();
      this.setupInfiniteScroll();
 
      // Setup close button handler
      const closeButton = document.querySelector('.job-detail-close');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          document.getElementById('job-detail-container')
            .classList.remove('job-detail-visible');
          document.querySelector('.job-board-container')
            .classList.remove('show-detail');
        });
      }
    }
};
 
export default JobBoard;