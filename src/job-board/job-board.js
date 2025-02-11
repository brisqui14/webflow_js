/*******************************************************
 * job-board.js
 *
 * Two separate inputs:
 *   - #search_input (Title)
 *   - #location_search_input (Location, with autocomplete)
 * One single button (#search_button) that triggers both.
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
        workTypes: [],
        selectedLocationId: null, // For storing place_id if chosen from suggestions
      },
      locationSuggestions: [],
      locationSearchTimeout: null,
    },
  
    /*******************************************************
     * Location Autocomplete
     *******************************************************/
    async suggestLocations(searchText) {
      if (!searchText) {
        this.state.locationSuggestions = [];
        return;
      }
  
      try {
        const { data, error } = await window.supabase
          .from('structured_locations')
          .select('place_id, formatted_address')
          .ilike('formatted_address', `%${searchText}%`)
          .limit(5);
  
        if (error) throw error;
        this.state.locationSuggestions = data || [];
        this.updateLocationSuggestions();
      } catch (err) {
        console.error('Error fetching location suggestions:', err);
        this.state.locationSuggestions = [];
      }
    },
  
    updateLocationSuggestions() {
      const suggestionsList = document.getElementById('location-suggestions');
      if (!suggestionsList) return;
  
      suggestionsList.innerHTML = '';
  
      if (this.state.locationSuggestions.length === 0) {
        suggestionsList.style.display = 'none';
        return;
      }
  
      this.state.locationSuggestions.forEach(location => {
        const li = document.createElement('li');
        li.textContent = location.formatted_address;
        li.addEventListener('click', () => {
          // User selected a suggestion
          const locInput = document.getElementById('location_search_input');
          if (locInput) {
            locInput.value = location.formatted_address;
          }
          this.state.filters.location = location.formatted_address;
          this.state.filters.selectedLocationId = location.place_id;
  
          suggestionsList.style.display = 'none';
        });
        suggestionsList.appendChild(li);
      });
  
      suggestionsList.style.display = 'block';
    },
  
    /*******************************************************
     * Initializing filters, checkboxes, etc.
     *******************************************************/
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
              this.state.filters.locationTypes =
                this.state.filters.locationTypes.filter(type => type !== value);
            }
            // Instead of refreshing immediately, we wait for Search button press.
          });
        }
      });
  
      // Work Type checkboxes
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
              this.state.filters.workTypes =
                this.state.filters.workTypes.filter(type => type !== value);
            }
            // Instead of refreshing immediately, we wait for Search button press.
          });
        }
      });
  
      // Title input
      const titleInput = document.getElementById('search_input');
  
      // Location input + autocomplete suggestions
      const locInput = document.getElementById('location_search_input');
      if (locInput) {
        // Create container for suggestions if it doesn't exist
        let suggestionsList = document.getElementById('location-suggestions');
        if (!suggestionsList) {
          suggestionsList = document.createElement('ul');
          suggestionsList.id = 'location-suggestions';
          suggestionsList.className = 'location-suggestions';
          locInput.parentNode.insertBefore(suggestionsList, locInput.nextSibling);
        }
  
        // Listen for typing => triggers location suggestions
        locInput.addEventListener('input', (e) => {
          clearTimeout(this.state.locationSearchTimeout);
          const searchText = e.target.value;
          this.state.locationSearchTimeout = setTimeout(() => {
            this.suggestLocations(searchText);
          }, 300);
        });
  
        locInput.addEventListener('focus', () => {
          if (this.state.locationSuggestions.length > 0) {
            suggestionsList.style.display = 'block';
          }
        });
  
        // Hide suggestions on outside click
        document.addEventListener('click', (e) => {
          if (!locInput.contains(e.target) && !suggestionsList.contains(e.target)) {
            suggestionsList.style.display = 'none';
          }
        });
      }
  
      // Single button that triggers all
      const searchButton = document.getElementById('search_button');
      if (searchButton) {
        searchButton.addEventListener('click', () => {
          // Set the filters from both inputs
          if (titleInput) {
            this.state.filters.title = titleInput.value.trim();
          }
          // If user hasn't selected a suggestion, just do text-based search
          if (locInput && !this.state.filters.selectedLocationId) {
            this.state.filters.location = locInput.value.trim();
          }
  
          // After setting filters, trigger the job fetch
          this.refreshJobs();
  
          // Optionally set up infinite scroll here after the first search,
          // so it doesn't trigger on page load:
          if (!this._infiniteScrollSet) {
            this.setupInfiniteScroll();
            this._infiniteScrollSet = true;
          }
        });
      }
    },
  
    /*******************************************************
     * The rest is standard fetch/filter logic as before
     *******************************************************/
    async fetchJobs() {
      if (this.state.isLoading || !this.state.hasMore) return;
      this.state.isLoading = true;
  
      try {
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
  
        // Apply Title Filter
        if (this.state.filters.title) {
          query = query.ilike('title', `%${this.state.filters.title}%`);
        }
  
        // Apply Location Filter
        if (this.state.filters.selectedLocationId) {
          // If user selected a specific place_id from suggestions
          query = query.contains('production_job_locations.place_id', [
            this.state.filters.selectedLocationId
          ]);
        } else if (this.state.filters.location) {
          // If user typed a location but didn't pick from suggestions
          // Note: .textSearch may require proper Postgres config
          query = query.textSearch(
            'production_job_locations.structured_locations.formatted_address',
            this.state.filters.location
          );
        }
  
        const { data: jobsData, error: jobsError } = await query;
        if (jobsError) throw jobsError;
  
        // Filter in memory for locationType, workType
        let filteredData = jobsData || [];
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
  
        // Update count
        this.state.totalResults = filteredData.length;
        this.updateResultsCount();
  
        // Clear existing
        const jobsContainer = document.querySelector('#job-listings-container');
        const template = jobsContainer.querySelector('.job-listing');
        if (template) {
          template.style.display = 'none';
        }
        while (jobsContainer.children.length > 1) {
          jobsContainer.removeChild(jobsContainer.lastChild);
        }
  
        // Render
        for (const job of filteredData) {
          const jobElement = await this.createJobElement(job);
          jobsContainer.appendChild(jobElement);
        }
  
        // Since we fetch everything at once, we won't have more beyond this
        this.state.hasMore = false;
      } catch (err) {
        console.error('Error loading jobs:', err);
        this.state.totalResults = 0;
        this.updateResultsCount();
      } finally {
        this.state.isLoading = false;
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
        const primaryLoc = job.production_job_locations.find(loc => loc.is_primary);
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
  
      // Click => show details
      element.style.cursor = 'pointer';
      element.addEventListener('click', () => {
        document.querySelectorAll('.job-listing.selected').forEach(el => {
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
        let locationAddress = 'Location not specified';
        if (job.production_job_locations && job.production_job_locations.length > 0) {
          const primaryLoc = job.production_job_locations.find(loc => loc.is_primary);
          if (primaryLoc?.structured_locations?.formatted_address) {
            locationAddress = primaryLoc.structured_locations.formatted_address;
          } else {
            const firstLoc = job.production_job_locations[0]?.structured_locations;
            if (firstLoc?.formatted_address) {
              locationAddress = firstLoc.formatted_address;
            }
          }
        }
  
        titleElement.textContent = job.title;
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
  
      // Add results counter
      const resultsCounter = document.createElement('div');
      resultsCounter.id = 'results-counter';
      resultsCounter.className = 'results-counter';
      jobsContainer.insertBefore(resultsCounter, jobsContainer.firstChild);
  
      // Set up filters, but DO NOT fetch on page load
      this.setupFilters();
      // this.fetchJobs(); // Removed to avoid auto-loading
  
      // Also do NOT set up infinite scroll until the user searches
      // this.setupInfiniteScroll();
  
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
  