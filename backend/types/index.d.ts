// ─── MERN App Tip Tanımları ───────────────────────────────────────

export interface IUser {
    _id: string;
    name: string;
    email: string;
    password?: string;
    role: 'user' | 'moderator' | 'admin';
    avatar: string;
    isActive: boolean;
    lastLogin?: Date;
    isEmailVerified: boolean;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    twoFactorSecret?: string;
    twoFactorEnabled: boolean;
    searchHistory: ISearchHistoryItem[];
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    generateEmailVerificationToken(): string;
    generatePasswordResetToken(): string;
}

export interface ISearchHistoryItem {
    query: string;
    searchedAt: Date;
}

export interface IMessage {
    _id: string;
    content: string;
    sender: string | IUser;
    room: string;
    type: 'text' | 'system' | 'file' | 'image';
    isEdited: boolean;
    editedAt?: Date;
    isDeleted: boolean;
    deletedAt?: Date;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface INotification {
    _id: string;
    userId: string;
    type: 'message' | 'system' | 'mention' | 'welcome' | 'role_change' | 'login' | 'security';
    title: string;
    message: string;
    isRead: boolean;
    data?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

export interface IRoom {
    _id: string;
    name: string;
    description: string;
    type: 'general' | 'random' | 'tech' | 'custom';
    icon: string;
    createdBy?: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface IRefreshToken {
    _id: string;
    token: string;
    userId: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
    createdAt: Date;
}

export interface IApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
}

export interface IPaginationInfo {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
}
