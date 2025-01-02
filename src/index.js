// Auth imports
import { initializeSupabase, getUserId, checkAuthStateAndUpdateUI, handleSignIn } from './auth.js';

// Profile page imports
import {
  handleProfileSave,
  populateProfileForm
} from './profile/profile-functions.js';

import {
  populateWorkExperiences,
  generateWorkExperienceId,
  deleteWorkExperience
} from './profile/work-functions.js';

import {
  populateEducationExperiences,
  generateEducationExperienceId,
  deleteEducationExperience
} from './profile/edu-functions.js';

import {
  uploadResume,
  retrieveAndDisplayUserResumes
} from './profile/resume-functions.js';

import {
  uploadCoverLetter,
  retrieveAndDisplayUserCoverLetters
} from './profile/cover-functions.js';

// Job board import
import JobBoard from './job-board/job-board.js';

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Supabase client first
  const isInitialized = initializeSupabase();
  if (!isInitialized) {
    console.error('Supabase client could not be initialized.');
    return; // Stop execution if Supabase client is not initialized
  }

  // Check authentication state
  await checkAuthStateAndUpdateUI();

  // Get current page path
  const path = window.location.pathname;

  // Handle different pages
  if (path.includes('/landing')) {
    // Landing page specific code if needed
  }
  else if (path.includes('/signupin')) {
    // Handle sign in/up page
    const submitButton = document.getElementById('submit_signInUp');
    if (submitButton) {
      submitButton.addEventListener('click', async (event) => {
        event.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const { error } = await handleSignIn(email, password);

        if (error) {
          alert('Sign-in failed. Please check your email and password.');
          console.error('Sign-in error:', error);
        } else {
          window.location.href = '/browse';
        }
      });
    }
  }
  else if (path.includes('/profile')) {
    // Initialize profile page
    await initializeProfilePage();
  }
  else if (path.includes('/browse')) {
    // Initialize job board
    JobBoard.init();
  }
});

// Profile page initialization and event handlers
async function initializeProfilePage() {
  // Initial data population
  await populateProfileForm();
  await populateEducationExperiences();
  await populateWorkExperiences();

  // Save button handler
  const saveButton = document.getElementById('save_pro');
  if (saveButton) {
    saveButton.addEventListener('click', handleProfileSave);
  }

  // Education add button handler
  const eduAddButton = document.getElementById('edu_add');
  if (eduAddButton) {
    eduAddButton.addEventListener('click', async (e) => {
      e.preventDefault();
      const eduContainer = document.getElementById('edu_container');
      const newEduId = generateEducationExperienceId();
      const eduTemplate = document.getElementById('edu-template');
      const newEduItem = eduTemplate.content.cloneNode(true);
      const eduItem = newEduItem.querySelector('.edu-item');
      eduItem.dataset.id = newEduId;
      eduContainer.appendChild(newEduItem);
    });
  }

  // Work experience add button handler
  const workAddButton = document.getElementById('work_add');
  if (workAddButton) {
    workAddButton.addEventListener('click', async (e) => {
      e.preventDefault();
      const workContainer = document.getElementById('work_container');
      const newWorkId = generateWorkExperienceId();
      const workTemplate = document.getElementById('work-template');
      const newWorkItem = workTemplate.content.cloneNode(true);
      const workItem = newWorkItem.querySelector('.work-item');
      workItem.dataset.id = newWorkId;
      workContainer.appendChild(newWorkItem);
    });
  }

  // Resume file upload handler
  const resumeInput = document.getElementById('resume-file');
  if (resumeInput) {
    resumeInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await uploadResume(file);
      }
    });
  }

  // Cover letter file upload handler
  const coverLetterInput = document.getElementById('cover_letter-file');
  if (coverLetterInput) {
    coverLetterInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await uploadCoverLetter(file);
      }
    });
  }

  // Remove instance button handlers (using event delegation)
  document.addEventListener('click', async (event) => {
    if (event.target.classList.contains('remove-instance-btn')) {
      event.preventDefault();
      const userId = await getUserId();

      // Handle education item removal
      const eduItem = event.target.closest('.edu-item');
      if (eduItem) {
        const eduItemId = eduItem.dataset.id;
        await deleteEducationExperience(eduItemId);
        eduItem.remove();
      }

      // Handle work experience item removal
      const workItem = event.target.closest('.work-item');
      if (workItem) {
        const workItemId = workItem.dataset.id;
        await deleteWorkExperience(workItemId);
        workItem.remove();
      }
    }
  });

  // Setup auth button handler
  const authButton = document.getElementById('authButton');
  if (authButton) {
    authButton.addEventListener('click', async (event) => {
      event.preventDefault();
      const { data: { session } } = await window.supabase.auth.getSession();
      if (session) {
        await window.supabase.auth.signOut();
        window.location.href = '/signupin';
      } else {
        window.location.href = '/signupin';
      }
    });
  }
}