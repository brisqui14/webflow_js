// src/profile/profile-functions.js

// Retrieve the user's profile data from Supabase
export async function getUserProfile(userId) {
    const { data, error } = await supabase
      .from('user_profile')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) {
      console.error('Error retrieving user profile:', error);
      return null;
    }
    return data;
  }
  
  // Update the user's profile data in Supabase
  export async function updateUserProfile(userId, profileData) {
    const { data, error } = await supabase
      .from('user_profile')
      .update(profileData)
      .eq('user_id', userId);
    if (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
    return true;
  }
  
  // Handle profile save button click
  export async function handleProfileSave(event) {
    event.preventDefault();
  
    const userId = await getUserId();
  
    const textFields = {
      legal_first_n: 'legal_first_n',
      legal_middle_n: 'legal_middle_n',
      legal_last_n: 'legal_last_n',
      preferred_first_n: 'preferred_first_n',
      first_n_pronunciation: 'first_n_pronunciation', 
      email: 'email',
      portfolio_url: 'portfolio_url',
      portfolio_password: 'portfolio_pword',
      portfolio_with_password: 'portfolio_with_password',
      primary_url: 'primary_url',
      case_study_url: 'case_study_url',
      linkedin_url: 'linkedin_url',
      phone: 'phone',
      home_street_address: 'street_address',
      home_city_town: 'city_town',
      birth_day: 'birth_day',
      birth_month: 'birth_month',
      birth_year: 'birth_year',
      home_zip_code: 'zipcode',
      github_url: 'github_url',
      addit_url: 'addit_url',
      personal_summary: 'personal_summary',
      next_opp_goals: 'next_opp_goals',
      proudest_accomplish: 'proudest_accomplish',
      adapt_deviate: 'adapt_deviate',
      why_apply: 'why_apply',
      biggest_mistake: 'biggest_mistake',
      biggest_strength: 'biggest_strength',
      hourly_reqs: 'hourly_reqs',
      notice_period: 'notice_period',
      reasonable_accomodation: 'reasonable_accomodation'
    };
  
    const formData = {};
    for (const [field, elementId] of Object.entries(textFields)) {
      const element = document.getElementById(elementId);
      formData[field] = element ? element.value : '';
    }
  
    const dropdownFields = {
      gender_status: '#gender_status select',
      race_ethnicity: '#race_ethnicity select',
      veteran_status: '#veteran_status select',
      disability_status: '#disability_status select',
      home_state: '#state_dropdown select',
      home_time_zone: '#time_zone_dropdown select',
      us_req_sponsorship: '#us_req_sponsorship select',
      nda_noncomp: '#nda_noncomp select',
      salary_range_response: '#salary_range_response select',
      open_relocation: '#open_relocation select',
      us_work_auth: '#us_work_auth select',
      sexual_orientation: '#sexual_orientation select',
      trans_identity: '#trans_identity select',
      us_citizen_status: '#us_citizen_status select',
      clearance_eligible: '#clearance_eligible select',
      hear_about_us: '#hear_about_us select',
      current_employee_of: '#current_employee_of select',
      ever_worked_here: '#ever_worked_here select',
      were_referred: '#were_referred select',
      who_referred: '#who_referred select',
      submit_to_bg_check: '#submit_to_bg_check select',
      can_contact_me: '#can_contact_me select',
      home_country: '#country_dropdown select',
      process_my_data: '#process_my_data select',
      lgbtq_identity: '#lgbtq_identity select',
      active_clearance: '#active_clearance select',
      applied_before: '#applied_before select',
      available_to_start: '#available_to_start select',
      open_communication: '#open_communication select',
      employment_type_preference: '#employment_type_preference select'
    };
  
    for (const [field, selector] of Object.entries(dropdownFields)) {
      const dropdown = document.querySelector(selector);
      formData[field] = dropdown ? dropdown.value : '';
    }
  
    // Pronouns handling
    formData.pronouns = Array.from(document.querySelectorAll('#pronouns input[type="checkbox"]:checked'))
      .map(checkbox => checkbox.nextElementSibling.textContent.trim())
      .join(',');
  
    const educationExperiences = document.querySelectorAll('.edu-item');
    if (educationExperiences.length > 0) {
      await saveEducationExperiences(userId);
    }
  
    const workExperiences = document.querySelectorAll('.work-item');
    if (workExperiences.length > 0) {
      await saveWorkExperiences(userId);
    }
  
    // Upload resume file
    const resumeFile = document.getElementById('resume-file').files[0];
    if (resumeFile) {
      await uploadResume(resumeFile);
    }
  
    // Upload cover Letter file
    const coverLetterFile = document.getElementById('cover_letter-file').files[0];
    if (coverLetterFile) {
      await uploadCoverLetter(coverLetterFile);
    }
  
    const success = await updateUserProfile(userId, formData);
  
    if (success) {
      alert('Profile updated successfully!');
      populateProfileForm(); // Refresh the resume list
    } else {
      alert('Failed to update profile. Please try again.');
    }
  }