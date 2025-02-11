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
        const titleInput = document.getElementById('search_input');
        const locInput = document.getElementById('location_search_input');
        const searchButton = document.getElementById('search_button');

        if (searchButton) {
            searchButton.addEventListener('click', () => {
                if (titleInput) {
                    this.state.filters.title = titleInput.value.trim();
                }
                if (locInput) {
                    this.state.filters.location = locInput.value.trim();
                }

                this.refreshJobs();

                // Re-enable infinite scroll after first search
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
                .limit(1000);

            if (this.state.filters.title) {
                query = query.ilike('title', `%${this.state.filters.title}%`);
            }

            if (this.state.filters.location) {
                query = query
                    .ilike('production_job_locations.structured_locations.formatted_address', `%${this.state.filters.location}%`)
                    .not('production_job_locations.place_id', 'is', null);
            }

            const { data: jobsData, error: jobsError } = await query;
            if (jobsError) throw jobsError;

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

            this.state.totalResults = filteredData.length;
            this.updateResultsCount();

            const jobsContainer = document.querySelector('#job-listings-container');
            const template = jobsContainer.querySelector('.job-listing');
            if (template) {
                template.style.display = 'none';
            }
            while (jobsContainer.children.length > 1) {
                jobsContainer.removeChild(jobsContainer.lastChild);
            }

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
     * Infinite Scroll
     *******************************************************/
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

    /*******************************************************
     * Update Results Count
     *******************************************************/
    updateResultsCount() {
        const resultsCounter = document.getElementById('results-counter');
        if (resultsCounter) {
            resultsCounter.textContent = `${this.state.totalResults} ${this.state.totalResults === 1 ? 'job' : 'jobs'} found`;
        }
    },

    /*******************************************************
     * Refresh Jobs List
     *******************************************************/
    refreshJobs() {
        this.state.hasMore = true;
        this.fetchJobs();
    },

    /*******************************************************
     * Initialize the Job Board
     *******************************************************/
    init() {
        this.setupFilters();
    }
};

export default JobBoard;
