/*******************************************************
 * job-board.js
 
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

    /*******************************************************
     * Initializing filters and event listeners
     *******************************************************/
    setupFilters() {
        // Title input
        const titleInput = document.getElementById('search_input');

        // Location input
        const locInput = document.getElementById('location_search_input');

        // Search button
        const searchButton = document.getElementById('search_button');
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                // Capture search input values
                if (titleInput) {
                    this.state.filters.title = titleInput.value.trim();
                }
                if (locInput) {
                    this.state.filters.location = locInput.value.trim();
                }

                // Trigger job search
                this.refreshJobs();

                // Set up infinite scroll after first search
                if (!this._infiniteScrollSet) {
                    this.setupInfiniteScroll();
                    this._infiniteScrollSet = true;
                }
            });
        }
    },

    /*******************************************************
     * Fetch jobs with filters applied
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
                .order('created_at', { ascending: false })
                .limit(1000); // Supabase limit

            // Apply Title Filter
            if (this.state.filters.title) {
                query = query.ilike('title', `%${this.state.filters.title}%`);
            }

            // Apply Location Filter
            if (this.state.filters.location) {
                query = query
                    .ilike('production_job_locations.structured_locations.formatted_address', `%${this.state.filters.location}%`)
                    .not('production_job_locations.place_id', 'is', null);
            }

            const { data: jobsData, error: jobsError } = await query;
            if (jobsError) throw jobsError;

            // In-memory filtering for location types & work types
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

            // Update total count
            this.state.totalResults = filteredData.length;
            this.updateResultsCount();

            // Clear existing job listings before adding new ones
            const jobsContainer = document.querySelector('#job-listings-container');
            const template = jobsContainer.querySelector('.job-listing');
            if (template) {
                template.style.display = 'none';
            }
            while (jobsContainer.children.length > 1) {
                jobsContainer.removeChild(jobsContainer.lastChild);
            }

            // Render Jobs
            for (const job of filteredData) {
                const jobElement = await this.createJobElement(job);
                jobsContainer.appendChild(jobElement);
            }

            // No more jobs to load after this batch
            this.state.hasMore = false;
        } catch (err) {
            console.error('Error loading jobs:', err);
            this.state.totalResults = 0;
            this.updateResultsCount();
        } finally {
            this.state.isLoading = false;
        }
    },

    /*******************************************************
     * Create job listing elements
     *******************************************************/
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

        // Extract location
        let locationText = 'Location not specified';
        if (job.production_job_locations && job.production_job_locations.length > 0) {
            const primaryLoc = job.production_job_locations.find(loc => loc.is_primary);
            if (primaryLoc?.structured_locations?.formatted_address) {
                locationText = primaryLoc.structured_locations.formatted_address;
            } else {
                const firstLoc = job.production_job_locations[0]?.structured_locations;
                if (firstLoc?.formatted_address) {
                    locationText = firstLoc.formatted_address;
                }
            }
        }

        element.querySelector('.job-location').textContent = locationText;

        // Click event to show job details
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

    /*******************************************************
     * Display job details
     *******************************************************/
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
                }
            }

            titleElement.textContent = job.title;
            contentElement.innerHTML = `
                <div class="job-company-header">
                    ${job.production_companies?.logo_url
                        ? `<img src="${job.production_companies.logo_url}" alt="${job.production_companies.name}" class="company-logo">`
                        : ''}
                    <div class="company-info">
                        <h3 class="company-name">${job.production_companies?.name || ''}</h3>
                        <div class="company-details">
                            <p>${locationAddress}</p>
                        </div>
                    </div>
                </div>
                <div class="job-description">${job.description || ''}</div>
            `;
        } catch (error) {
            console.error('Error loading job details:', error);
            contentElement.innerHTML = `<div class="error-message">
                Error loading job details: ${error.message}
            </div>`;
        }
    },

    updateResultsCount() {
        const resultsCounter = document.getElementById('results-counter');
        if (resultsCounter) {
            resultsCounter.textContent = `${this.state.totalResults} ${this.state.totalResults === 1 ? 'job' : 'jobs'} found`;
        }
    },

    refreshJobs() {
        this.state.hasMore = true;
        this.fetchJobs();
    },

    init() {
        this.setupFilters();
    }
};

export default JobBoard;
