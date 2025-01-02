// src/job-board/job-board.js

// JobBoard module
const JobBoard = {
    // State management
    state: {
      currentPage: 1,
      isLoading: false,
      hasMore: true,
      filters: {
        title: null,
        location: null,
        locationRange: null,
        locationType: [],
        workType: [],
        company: null,
        keywords: [],
        compensationMin: null,
        compensationMax: null
      }
    },
  
    // Constants
    PAGE_SIZE: 20,
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
      production_companies (
        company_id,
        name,
        company_url,
        logo_url
      )
    `,
  
    async fetchJobs() {
      if (this.state.isLoading || !this.state.hasMore) return;
      
      this.state.isLoading = true;
      
      try {
        const { data, error, count } = await supabase
          .from('production_jobs')
          .select(this.PREVIEW_FIELDS, { count: 'exact' })
          .range(
            (this.state.currentPage - 1) * this.PAGE_SIZE, 
            this.state.currentPage * this.PAGE_SIZE - 1
          )
          .order('created_at', { ascending: false });
  
        if (error) throw error;
  
        const jobsContainer = document.querySelector('#job-listings-container');
        
        // Remove template if it's the first load
        if (this.state.currentPage === 1) {
          const template = jobsContainer.querySelector('.job-listing');
          if (template) {
            template.style.display = 'none';
          }
        }
  
        data.forEach(job => {
          const jobElement = this.createJobElement(job);
          jobsContainer.appendChild(jobElement);
        });
  
        this.state.hasMore = data.length === this.PAGE_SIZE;
        this.state.currentPage++;
      } catch (error) {
        console.error('Error loading jobs:', error);
      } finally {
        this.state.isLoading = false;
      }
    },
  
    createJobElement(job) {
      const template = document.querySelector('.job-listing');
      const element = template.cloneNode(true);
      
      // Remove any template-specific classes/attributes
      element.removeAttribute('style');
      
      // Set job details
      element.querySelector('.job-title').textContent = job.title;
      element.querySelector('.job-company').textContent = job.production_companies?.name || '';
      element.querySelector('.job-location').textContent = job.processed_locations?.[0] || '';
      
      // Make the entire job listing clickable
      element.style.cursor = 'pointer';
      element.addEventListener('click', () => {
        if (job.job_url) {
          window.open(job.job_url, '_blank');
        }
      });
  
      return element;
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
      // Initial load
      this.fetchJobs();
      
      // Setup infinite scroll
      this.setupInfiniteScroll();
    }
  };
  
  export default JobBoard;