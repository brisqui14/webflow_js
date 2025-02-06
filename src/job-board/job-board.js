// JobBoard module
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
 
    // Constants
    PREVIEW_FIELDS: `
      job_id,
      company_id,
      title,
      job_url,
      department,
      team,
      processed_locations,
      processed_location_types,
      processed_work_types,
      processed_keywords,
      processed_comp,
      structured_locations!processed_locations(
        place_id,
        formatted_address
      ),
      production_companies (
        company_id,
        name,
        company_url,
        logo_url
      )
    `,
 
    PAGE_SIZE: 200,

    updateResultsCount() {
      const resultsCounter = document.getElementById('results-counter');
      if (resultsCounter) {
        resultsCounter.textContent = `${this.state.totalResults} ${this.state.totalResults === 1 ? 'job' : 'jobs'} found`;
      }
    },
 
    // Add filter handling
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
 
        // Also trigger search on enter key
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
        let query = supabase
          .from('production_jobs')
          .select(this.PREVIEW_FIELDS)
          .order('created_at', { ascending: false });
 
        // Apply filters
        if (this.state.filters.title) {
          query = query.ilike('title', `%${this.state.filters.title}%`);
        }
 
        if (this.state.filters.locationTypes.length > 0) {
          query = query.overlaps('processed_location_types', this.state.filters.locationTypes);
        }
 
        if (this.state.filters.workTypes.length > 0) {
          query = query.overlaps('processed_work_types', this.state.filters.workTypes);
        }
 
        const { data, error } = await query.range(0, 199);
 
        if (error) throw error;
 
        // Filter out duplicates
        const seen = new Set();
        const uniqueJobs = [];
        for (const job of data) {
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
        uniqueJobs.forEach(job => {
          const jobElement = this.createJobElement(job);
          jobsContainer.appendChild(jobElement);
        });
 
        this.state.hasMore = false;
 
      } catch (err) {
        console.error('Error loading jobs:', err);
        this.state.totalResults = 0;
        this.updateResultsCount();
      } finally {
        this.state.isLoading = false;
      }
    },
 
    async showJobDetails(jobId) {
      const detailContainer = document.getElementById('job-detail-container');
      const titleElement = detailContainer.querySelector('.job-detail-title');
      const contentElement = detailContainer.querySelector('.job-detail-content');
     
      // Show loading state
      titleElement.textContent = 'Loading...';
      contentElement.innerHTML = '<div class="loading-spinner"></div>';
      detailContainer.classList.add('job-detail-visible');
      document.querySelector('.job-board-container').classList.add('show-detail');
 
      try {
        // Fetch job details including description
        const { data: jobData, error: jobError } = await window.supabase
          .from('production_jobs')
          .select(`
            *,
            production_companies (
              name,
              logo_url
            )
          `)
          .eq('job_id', jobId)
          .single();
 
        if (jobError) throw jobError;

        // Fetch location data if available
        let locationAddress = 'Location not specified';
        if (jobData.processed_locations && jobData.processed_locations.length > 0) {
          const locations = await this.getFormattedAddresses(jobData.processed_locations);
          if (locations.length > 0) {
            locationAddress = locations[0].formatted_address;
          }
        }
 
        // Update content
        titleElement.textContent = jobData.title;
       
        // Create content HTML
        const contentHTML = `
          <div class="job-company-header">
            ${jobData.production_companies?.logo_url ?
              `<img src="${jobData.production_companies.logo_url}"
               alt="${jobData.production_companies.name}"
               class="company-logo">` : ''
            }
            <div class="company-info">
              <h3>${jobData.production_companies?.name || ''}</h3>
              <p class="company-details">
                ${[
                  jobData.department,
                  jobData.team,
                  locationAddress
                ].filter(Boolean).join('; ')}
              </p>
            </div>
            ${jobData.job_url ? 
              `<a href="${jobData.job_url}" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="apply-button">
                Apply Now
              </a>` : ''
            }
          </div>
          <div class="job-tags">
            ${(jobData.processed_work_types || [])
              .map(type => `<span class="job-tag">${type}</span>`)
              .join('')
            }
          </div>
          <div class="job-description">
            ${jobData.description || ''}
          </div>
        `;
       
        contentElement.innerHTML = contentHTML;
 
      } catch (error) {
        contentElement.innerHTML = `<div class="error-message">
          Error loading job details: ${error.message}
        </div>`;
      }
    },
 
    createJobElement(job) {
      const template = document.querySelector('.job-listing');
      
      if (!template) {
        console.error('Job listing template not found');
        // Create a new element from scratch if template doesn't exist
        const element = document.createElement('div');
        element.className = 'job-listing';
        element.innerHTML = `
          <h3 class="job-title"></h3>
          <p class="job-company-location">
            <span class="job-company"></span> - <span class="job-location"></span>
          </p>
        `;
        return this.populateJobElement(element, job);
      }

      const element = template.cloneNode(true);
      return this.populateJobElement(element, job);
    },

    populateJobElement(element, job) {
      // Remove any template-specific attributes
      element.removeAttribute('style');
      
      // Set job details
      element.querySelector('.job-title').textContent = job.title;
      element.querySelector('.job-company').textContent = job.production_companies?.name || '';
      
      // Get formatted address from structured_locations
      const locationAddress = job.structured_locations?.[0]?.formatted_address || 'Location not specified';
      element.querySelector('.job-location').textContent = locationAddress;
      
      // Make the entire job listing clickable
      element.style.cursor = 'pointer';
      element.addEventListener('click', () => {
        this.showJobDetails(job.job_id);
      });

      return element;
    },
 
    // Add method to refresh jobs when filters change
    refreshJobs() {
      const jobsContainer = document.querySelector('#job-listings-container');
      if (jobsContainer) {
        // Reset container and fetch with new filters
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
 
      // Create and observe sentinel element
      const sentinel = document.createElement('div');
      sentinel.id = 'infinite-scroll-sentinel';
      document.querySelector('#job-listings-container').appendChild(sentinel);
      observer.observe(sentinel);
    },
 
    init() {
      // Ensure DOM is loaded before initialization
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

      // Initialize the template if it doesn't exist
      if (!document.querySelector('.job-listing')) {
        const template = document.createElement('div');
        template.className = 'job-listing';
        template.style.display = 'none';
        template.innerHTML = `
          <h3 class="job-title"></h3>
          <p class="job-company-location">
            <span class="job-company"></span> - <span class="job-location"></span>
          </p>
        `;
        jobsContainer.appendChild(template);
      }

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