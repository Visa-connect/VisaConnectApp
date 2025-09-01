import { apiGet, apiPost } from './index';

export interface Meetup {
  id: number;
  title: string;
  description: string;
  location: string;
  meetup_date: string;
  category_id: number;
  category_name: string;
  creator_id: string;
  creator_name: string;
  created_at: string;
  max_participants?: number;
  current_participants: number;
  is_interested?: boolean;
  photo_url?: string;
  photo_public_id?: string;
}

export interface MeetupCategory {
  id: number;
  name: string;
  description?: string;
}

export interface CreateMeetupRequest {
  /** Required: The ID of the meetup category */
  category_id: number;
  /** Required: The title of the meetup (max 100 characters) */
  title: string;
  /** Required: Detailed description of the meetup (max 1000 characters) */
  description: string;
  /** Required: Location where the meetup will take place (max 200 characters) */
  location: string;
  /** Required: ISO string date when the meetup will occur (must be in the future) */
  meetup_date: string;
  /** Optional: Maximum number of participants allowed (1-1000) */
  max_participants?: number | null;
  /** Optional: Cloudinary secure URL for the meetup photo (max 500 characters, must be valid URL) */
  photo_url?: string | null;
  /** Optional: Cloudinary public ID for the meetup photo (max 255 characters, format: folder/filename) */
  photo_public_id?: string | null;
}

export interface SearchMeetupsParams {
  keyword?: string;
  category_id?: number;
  location?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface MeetupsResponse {
  success: boolean;
  data: Meetup[];
}

export interface MeetupResponse {
  success: boolean;
  data: Meetup;
}

export interface CategoriesResponse {
  success: boolean;
  data: MeetupCategory[];
}

export interface CreateMeetupResponse {
  success: boolean;
  data: { meetupId: number };
  message: string;
}

class MeetupService {
  // Get all meetups with optional search parameters
  async getMeetups(params: SearchMeetupsParams = {}): Promise<Meetup[]> {
    const queryParams = new URLSearchParams();

    if (params.keyword) queryParams.append('keyword', params.keyword);
    if (params.category_id)
      queryParams.append('category_id', params.category_id.toString());
    if (params.location) queryParams.append('location', params.location);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    const url = `/api/meetups${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;
    const response: MeetupsResponse = await apiGet(url);
    return response.data;
  }

  // Get a specific meetup by ID
  async getMeetup(meetupId: number): Promise<Meetup> {
    const response: MeetupResponse = await apiGet(`/api/meetups/${meetupId}`);
    return response.data;
  }

  // Get all meetup categories
  async getCategories(): Promise<MeetupCategory[]> {
    const response: CategoriesResponse = await apiGet(
      '/api/meetups/categories'
    );
    return response.data;
  }

  // Create a new meetup
  async createMeetup(meetupData: CreateMeetupRequest): Promise<number> {
    const response: CreateMeetupResponse = await apiPost(
      '/api/meetups',
      meetupData
    );
    return response.data.meetupId;
  }

  // Express interest in a meetup
  async expressInterest(meetupId: number): Promise<void> {
    await apiPost(`/api/meetups/${meetupId}/interest`, {});
  }

  // Remove interest from a meetup
  async removeInterest(meetupId: number): Promise<void> {
    await apiPost(`/api/meetups/${meetupId}/interest/remove`, {});
  }
}

export const meetupService = new MeetupService();
export default meetupService;
