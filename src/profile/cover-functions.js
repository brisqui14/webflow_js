// src/profile/cover-functions.js

async function uploadCoverLetter(coverLetterFile) {
  try {
    const { data: { user }, } = await supabase.auth.getUser();
    const userId = user.id;
    const fileName = `${userId}_${Date.now()}_${coverLetterFile.name}`;
    const filePath = `cover_letters/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('cover_letters')
      .upload(filePath, coverLetterFile);

    if (uploadError) {
      console.error('Error uploading cover letter:', uploadError);
      alert('Failed to upload cover letter. Please try again.');
    } else {
      alert('Cover letter uploaded successfully!');
      // Store the file metadata in the user_cover_letters table
      await supabase.from('user_cover_letters').insert({ user_id: userId, file_path: filePath });
      retrieveAndDisplayUserCoverLetters(userId); // Refresh the cover letter list
    }
  } catch (error) {
    console.error('Error uploading cover letter:', error);
    alert('Failed to upload cover letter. Please try again.');
  }
}

async function deleteCoverLetter(userId, filePath) {
  try {
    // Delete the cover letter file from Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from('cover_letters')
      .remove([filePath]);

    if (deleteError) {
      console.error('Error deleting cover letter file:', deleteError);
      alert('Failed to delete cover letter. Please try again.');
    } else {
      // Delete the cover letter entry from the user_cover_letters table
      await supabase
        .from('user_cover_letters')
        .delete()
        .eq('user_id', userId)
        .eq('file_path', filePath);

      alert('Cover letter deleted successfully!');
    }
  } catch (error) {
    console.error('Error deleting cover letter:', error);
    alert('Failed to delete cover letter. Please try again.');
  }
}

async function retrieveAndDisplayUserCoverLetters(userId) {
  try {
    // Retrieve user's cover letters from the user_cover_letters table
    const { data: userCoverLetters, error: coverLettersError } = await supabase
      .from('user_cover_letters')
      .select('file_path')
      .eq('user_id', userId);

    if (coverLettersError) {
      console.error('Error retrieving user cover letters:', coverLettersError);
    } else {
      // Display the list of user's cover letters
      const coverLetterList = document.getElementById('cover-letter-list');
      coverLetterList.innerHTML = '';

      const coverLetterFileInput = document.getElementById('cover_letter-file');

      if (userCoverLetters.length === 0) {
        // Show the file input if there are no cover letters
        coverLetterFileInput.style.display = 'block';
      } else {
        // Hide the file input if there is at least one cover letter
        coverLetterFileInput.style.display = 'none';

        userCoverLetters.forEach(coverLetter => {
          const coverLetterItem = document.createElement('li');
          coverLetterItem.textContent = coverLetter.file_path;

          const deleteButton = document.createElement('button');
          deleteButton.textContent = 'Delete';
          deleteButton.type = 'button';
          deleteButton.classList.add('delete-cover-letter-btn');
          deleteButton.addEventListener('click', async (event) => {
            event.preventDefault(); // Prevent form submission
            await deleteCoverLetter(userId, coverLetter.file_path);
            retrieveAndDisplayUserCoverLetters(userId); // Refresh the cover letter list
          });

          coverLetterItem.appendChild(deleteButton);
          coverLetterList.appendChild(coverLetterItem);
        });
      }
    }
  } catch (error) {
    console.error('Error retrieving user cover letters:', error);
  }
}

export {
  uploadCoverLetter,
  deleteCoverLetter,
  retrieveAndDisplayUserCoverLetters
};