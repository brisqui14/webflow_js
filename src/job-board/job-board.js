/*******************************************************
 * job-board.js
 * 
 * Key Points:
 * 1) Uses the exact foreign key name: 
 *    production_job_locations!production_job_locations_job_fkey
 * 2) Selects `description` from `production_jobs`.
 *    Without this, you won't see the job description.
 * 3) Only references `place_id` + `formatted_address`
 *    in structured_locations (no city/state/country).
 * 4) Displays `description` in showJobDetails().
 *******************************************************/

const JobBoard = {
    state: {
      currentPage: 1,
      isLoading: false,
      hasMore: true,
      totalResults: 0,
      filters: {
        title: '',
        location: '',
        locationTypes: [],
        workTypes: []
      }
    },
  
    updateResultsCount() {
      const resultsCounter = document.getElementById('results-counter');
      if (resultsCounter) {
        resultsCounter.textContent = `${this.state.totalResults} ${
          this.state.totalResults === 1 ? 'job' : 'jobs'
        } found`;
      }
    },
  
    setupFilters() {
      // LOCATION TYPE CHECKBOXES
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
              this.state.filters.locationTypes = this.state.filters.locationTypes.filter(
                (type) => type !== value
              );
            }
            this.refreshJobs();
          });
        }
      });
  
      // WORK TYPE CHECKBOXES
      const workTypeIds = ['etftcb', 'etptcb', 'etcocb', 'etsecb', 'etlecb', 'etnscb'];
      const workTypeValues = [
        'Full-Time',
        'Part-Time',
        'Contract',
        'Seasonal',
        'Learning Experience Opportunity',
        'Not Specified'
      ];
  
      workTypeIds.forEach((id, index) => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
          checkbox.addEventListener('change', () => {
            const value = workTypeValues[index];
            if (checkbox.checked) {
              this.state.filters.workTypes.push(value);
            } else {
              this.state.filters.workTypes = this.state.filters.workTypes.filter(
                (type) => type !== value
              );
            }
            this.refreshJobs();
          });
        }
      });
  
      // TITLE SEARCH
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
  
      // LOCATION TEXT SEARCH (optional, front-end only)
      const locInput = document.getElementById('location_search_input');
      const locButton = document.getElementById('location_search_button');
      if (locInput && locButton) {
        locButton.addEventListener('click', () => {
          this.state.filters.location = locInput.value;
          this.refreshJobs();
        });
        locInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.state.filters.location = locInput.value;
            this.refreshJobs();
          }
        });
      }
    },
  
    async fetchJobs() {
      if (this.state.isLoading || !this.state.hasMore) return;
      this.state.isLoading = true;
  
      try {
        // IMPORTANT: We now include `description` in the select statement.
        // That way, job.description is actually returned and can be displayed.
        let query = window.supabase
          .from('production_jobs')
          .select(`
            job_id,
            title,
            description,
            processed_location_types,
            processed_work_types,
            production_companies (
              company_id,
              name,
              company_url,
              logo_url
            ),
            production_job_locations!production_job_locations_job_fkey (
              is_primary,
              place_id,
              structured_locations (
                place_id,
                formatted_address
              )
            )
          `)
          .order('created_at', { ascending: false });
  
        // Filter by title in DB
        if (this.state.filters.title) {
          query = query.ilike('title', `%${this.state.filters.title}%`);
        }
  
        const { data: jobsData, error: jobsError } = await query;
        if (jobsError) throw jobsError;
  
        // FRONT-END FILTERS for locationTypes / workTypes
        let filteredData = jobsData || [];
  
        if (this.state.filters.locationTypes.length > 0) {
          filteredData = filteredData.filter((job) =>
            job.processed_location_types?.some((type) =>
              this.state.filters.locationTypes.includes(type)
            )
          );
        }
  
        if (this.state.filters.workTypes.length > 0) {
          filteredData = filteredData.filter((job) =>
            job.processed_work_types?.some((type) =>
              this.state.filters.workTypes.includes(type)
            )
          );
        }
  
        // If you want front-end location search on the address:
        if (this.state.filters.location) {
          const locSearch = this.state.filters.location.toLowerCase();
          filteredData = filteredData.filter((job) => {
            if (!job.production_job_locations) return false;
            return job.production_job_locations.some((locObj) => {
              const addr = locObj.structured_locations?.formatted_address?.toLowerCase() || '';
              return addr.includes(locSearch);
            });
          });
        }
  
        this.state.totalResults = filteredData.length;
        this.updateResultsCount();
  
        // Clear existing job listings
        const jobsContainer = document.querySelector('#job-listings-container');
        const template = jobsContainer.querySelector('.job-listing');
        if (template) {
          template.style.display = 'none';
        }
        while (jobsContainer.children.length > 1) {
          jobsContainer.removeChild(jobsContainer.lastChild);
        }
  
        // Render each job
        for (const job of filteredData) {
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
      const element = document.createElement('div');
      element.className = 'job-listing';
      element.innerHTML = `
        <h3 class="job-title"></h3>
        <p class="job-company-location">
          <span class="job-company"></span> - <span class="job-location"></span>
        </p>
      `;
  
      element.querySelector('.job-title').textContent = job.title;
      element.querySelector('.job-company').textContent =
        job.production_companies?.name || '';
  
      // Location from production_job_locations
      let locationText = 'Location not specified';
      if (job.production_job_locations && job.production_job_locations.length > 0) {
        const primaryLoc = job.production_job_locations.find((loc) => loc.is_primary);
        if (primaryLoc && primaryLoc.structured_locations) {
          locationText = primaryLoc.structured_locations.formatted_address || locationText;
        } else {
          const firstLoc = job.production_job_locations[0].structured_locations;
          if (firstLoc) {
            locationText = firstLoc.formatted_address || locationText;
          }
        }
      }
      element.querySelector('.job-location').textContent = locationText;
  
      // Click handler to show job details
      element.style.cursor = 'pointer';
      element.addEventListener('click', () => {
        document.querySelectorAll('.job-listing.selected').forEach((el) => {
          el.classList.remove('selected');
        });
        element.classList.add('selected');
        this.showJobDetails(job);
      });
  
      return element;
    },
  
    async showJobDetails(job) {
      const detailContainer = document.getElementById('job-detail-container');
      const titleElement = detailContainer.querySelector('.job-detail-title');
      const contentElement = detailContainer.querySelector('.job-detail-content');
  
      titleElement.textContent = 'Loading...';
      contentElement.innerHTML = '<div class="loading-spinner"></div>';
      detailContainer.classList.add('job-detail-visible');
      document.querySelector('.job-board-container').classList.add('show-detail');
  
      try {
        // Determine primary location
        let locationAddress = 'Location not specified';
        if (job.production_job_locations && job.production_job_locations.length > 0) {
          const primaryLoc = job.production_job_locations.find((loc) => loc.is_primary);
          if (primaryLoc?.structured_locations?.formatted_address) {
            locationAddress = primaryLoc.structured_locations.formatted_address;
          } else {
            const firstLoc = job.production_job_locations[0]?.structured_locations;
            if (firstLoc?.formatted_address) {
              locationAddress = firstLoc.formatted_address;
            }
          }
        }
  
        // Show the title
        titleElement.textContent = job.title;
  
        // Build the HTML for job details, including job.description
        const contentHTML = `
          <div class="job-company-header">
            ${
              job.production_companies?.logo_url
                ? `<img src="${job.production_companies.logo_url}"
                    alt="${job.production_companies.name}"
                    class="company-logo">`
                : ''
            }
            <div class="company-info">
              <h3 class="company-name">${job.production_companies?.name || ''}</h3>
              <div class="company-details">
                <p>${locationAddress}</p>
              </div>
            </div>
            ${
              job.job_url
                ? `<div class="company-header-right">
                     <a href="${job.job_url}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="apply-button">
                       Apply Now
                     </a>
                   </div>`
                : ''
            }
          </div>
          <div class="job-tags">
            ${
              (job.processed_work_types || [])
                .map((type) => `<span class="job-tag">${type}</span>`)
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
        entries.forEach((entry) => {
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
  
      // (Optional) Add results counter
      const resultsCounter = document.createElement('div');
      resultsCounter.id = 'results-counter';
      resultsCounter.className = 'results-counter';
      jobsContainer.insertBefore(resultsCounter, jobsContainer.firstChild);
  
      this.setupFilters();
      this.fetchJobs();
      this.setupInfiniteScroll();
  
      const closeButton = document.querySelector('.job-detail-close');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          document
            .getElementById('job-detail-container')
            .classList.remove('job-detail-visible');
          document
            .querySelector('.job-board-container')
            .classList.remove('show-detail');
        });
      }
    }
  };
  
  export default JobBoard;
  