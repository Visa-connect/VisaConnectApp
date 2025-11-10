import { useUserStore } from '../stores/userStore';

export interface PhotoUploadResult {
  success: boolean;
  url?: string;
  fileName?: string; // Changed from publicId to fileName for Firebase Storage
  error?: string;
}

export const uploadProfilePhoto = async (
  file: File
): Promise<PhotoUploadResult> => {
  try {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('photo', file);

    // Get auth token from user store
    const token = useUserStore.getState().getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Upload to our backend API
    const response = await fetch('/api/photo/upload-profile-photo', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Upload failed: ${response.statusText}`
      );
    }

    const data = await response.json();

    return {
      success: true,
      url: data.url,
      fileName: data.fileName,
    };
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
};

export const deleteProfilePhoto = async (): Promise<PhotoUploadResult> => {
  try {
    // Get auth token from user store
    const token = useUserStore.getState().getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Delete through our backend API
    const response = await fetch('/api/photo/delete-profile-photo', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Delete failed: ${response.statusText}`
      );
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting profile photo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
};

// Meetup photo upload function
export const uploadMeetupPhoto = async (
  file: File
): Promise<PhotoUploadResult> => {
  try {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('photo', file);

    // Get auth token from user store
    const token = useUserStore.getState().getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Upload to our backend API
    const response = await fetch('/api/photo/upload-meetup-photo', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Upload failed: ${response.statusText}`
      );
    }

    const data = await response.json();

    return {
      success: true,
      url: data.url,
      fileName: data.fileName,
    };
  } catch (error) {
    console.error('Error uploading meetup photo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
};

// Delete meetup photo function
export const deleteMeetupPhoto = async (
  fileName: string
): Promise<PhotoUploadResult> => {
  try {
    // Get auth token from user store
    const token = useUserStore.getState().getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Delete through our backend API
    const response = await fetch('/api/photo/delete-meetup-photo', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileName }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Delete failed: ${response.statusText}`
      );
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting meetup photo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
};

// Business logo upload function
export const uploadBusinessLogo = async (
  file: File
): Promise<PhotoUploadResult> => {
  try {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('photo', file);

    // Get auth token from user store
    const token = useUserStore.getState().getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Upload to our backend API
    const response = await fetch('/api/photo/upload-business-logo', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Upload failed: ${response.statusText}`
      );
    }

    const data = await response.json();

    return {
      success: true,
      url: data.url,
      fileName: data.fileName,
    };
  } catch (error) {
    console.error('Error uploading business logo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
};

// Delete business logo function
export const deleteBusinessLogo = async (
  fileName: string
): Promise<PhotoUploadResult> => {
  try {
    // Get auth token from user store
    const token = useUserStore.getState().getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Delete through our backend API
    const response = await fetch('/api/photo/delete-business-logo', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileName }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Delete failed: ${response.statusText}`
      );
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting business logo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
};

// Resume upload function
export const uploadResume = async (file: File): Promise<PhotoUploadResult> => {
  try {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('resume', file);

    // Get auth token from user store
    const token = useUserStore.getState().getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Upload to our backend API
    const response = await fetch('/api/photo/upload-resume', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Upload failed: ${response.statusText}`
      );
    }

    const data = await response.json();

    return {
      success: true,
      url: data.url,
      fileName: data.fileName,
    };
  } catch (error) {
    console.error('Error uploading resume:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
};

// Tips/Trips/Advice photo upload function
export const uploadTipsPhoto = async (
  file: File
): Promise<PhotoUploadResult> => {
  try {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('photo', file);

    // Get auth token from user store
    const token = useUserStore.getState().getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Upload to our backend API
    const response = await fetch('/api/photo/upload-tips-photo', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Upload failed: ${response.statusText}`
      );
    }

    const data = await response.json();

    return {
      success: true,
      url: data.url,
      fileName: data.fileName,
    };
  } catch (error) {
    console.error('Error uploading tips photo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
};
