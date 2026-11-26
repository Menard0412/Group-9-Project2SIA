export type UserRole = 'admin' | 'instructor' | 'learner';

export type InstructorStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  displayName: string;
  role: UserRole;
  instructorStatus: InstructorStatus;
}

/** A profile as shown in the administrator panel. */
export interface AdminProfile extends Profile {
  createdAt: string;
}

export interface ClassRoom {
  id: string;
  instructorId: string;
  instructorName: string;
  title: string;
  description: string;
  joinCode: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  classId: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface Post {
  id: string;
  classId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  body: string;
  createdAt: string;
}

export interface Member {
  learnerId: string;
  name: string;
  joinedAt: string;
}
