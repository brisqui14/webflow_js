// src/profile/resume-functions.js
  
import { getUserId } from '../auth.js';


  export async function uploadResume(resumeFile) {
  try {
    const { data: { user }, } = await supabase.auth.getUser();
    const userId = user.id;
    const fileName = `${userId}_${Date.now()}_${resumeFile.name}`;
    const filePath = `resumes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(filePath, resumeFile);

    if (uploadError) {
      console.error('Error uploading resume:', uploadError);
      alert('Failed to upload resume. Please try again.');
    } else {
      alert('Resume uploaded successfully!');
      // Store the file metadata in the user_resumes table
      await supabase.from('user_resumes').insert({ user_id: userId, file_path: filePath });
      retrieveAndDisplayUserResumes(userId); // Refresh the resume list
    }
  } catch (error) {
    console.error('Error uploading resume:', error);
    alert('Failed to upload resume. Please try again.');
  }
}

export async function deleteResume(userId, filePath) {
    try {
      // Delete the resume file from Supabase Storage
      const { error: deleteError } = await supabase.storage
        .from('resumes')
        .remove([filePath]);

      if (deleteError) {
        console.error('Error deleting resume file:', deleteError);
        alert('Failed to delete resume. Please try again.');
      } else {
        // Delete the resume entry from the user_resumes table
        await supabase
          .from('user_resumes')
          .delete()
          .eq('user_id', userId)
          .eq('file_path', filePath);

        alert('Resume deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting resume:', error);
      alert('Failed to delete resume. Please try again.');
    }
  }

  export async function retrieveAndDisplayUserResumes(userId) {
  try {
    // Retrieve user's resumes from the user_resumes table
    const { data: userResumes, error: resumesError } = await supabase
      .from('user_resumes')
      .select('file_path')
      .eq('user_id', userId);

    if (resumesError) {
      console.error('Error retrieving user resumes:', resumesError);
    } else {
      // Display the list of user's resumes
      const resumeList = document.getElementById('resume-list');
      resumeList.innerHTML = '';

      const resumeFileInput = document.getElementById('resume-file');

      if (userResumes.length === 0) {
        // Show the file input if there are no resumes
        resumeFileInput.style.display = 'block';
      } else {
        // Hide the file input if there is at least one resume
        resumeFileInput.style.display = 'none';

        userResumes.forEach(resume => {
          const resumeItem = document.createElement('li');
          resumeItem.textContent = resume.file_path;

          const deleteButton = document.createElement('button');
          deleteButton.textContent = 'Delete';
          deleteButton.type = 'button';
          deleteButton.classList.add('delete-resume-btn');
          deleteButton.addEventListener('click', async (event) => {
            event.preventDefault(); // Prevent form submission
            await deleteResume(userId, resume.file_path);
            retrieveAndDisplayUserResumes(userId); // Refresh the resume list
          });

          resumeItem.appendChild(deleteButton);
          resumeList.appendChild(resumeItem);
        });
      }
    }
  } catch (error) {
    console.error('Error retrieving user resumes:', error);
  }
}
