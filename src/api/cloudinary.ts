import { useUserStore } from '../stores/userStore';

export interface PhotoUploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
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
      publicId: data.publicId,
    };
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
};

export const deleteProfilePhoto = async (
  publicId: string
): Promise<PhotoUploadResult> => {
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
      publicId: data.publicId,
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
  publicId: string
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
      body: JSON.stringify({ publicId }),
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
