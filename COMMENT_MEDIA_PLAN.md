# Comment Media Support Implementation Plan

**Status:** Not yet implemented
**Priority:** Low
**Created:** 2025-10-07

## Overview

Add support for attaching images/media to comments and replies, similar to the media functionality already available for posts.

## Current State

### ✅ What's Already Working
- **Database:** `media` table has `comment_id` foreign key - ready to store comment media
- **Backend:** Comment routes already query for media (see `backend/src/routes/comments.js:91`)
- **Backend:** Media upload API exists at `/api/media/upload` (supports `comment_id` parameter)

### ❌ What's Missing
- **Frontend CommentForm:** No file upload UI
- **Frontend PostCard:** Comments don't display attached media
- **Frontend API Integration:** No call to upload media files with comments
- **Image Modal:** No way to view comment images in fullscreen (posts have this)

## Implementation Plan

### Phase 1: Backend Verification (30 min)

1. **Verify Media Upload for Comments**
   - File: `backend/src/routes/media.js`
   - Check that `comment_id` is properly handled in upload endpoint
   - Test endpoint: `POST /api/media/upload` with `comment_id` parameter

2. **Verify Comment Retrieval with Media**
   - File: `backend/src/routes/comments.js`
   - Confirm media is being fetched in comment queries (line 88-91)
   - Check if media data is properly nested in response

### Phase 2: Frontend CommentForm Updates (2 hours)

**File:** `frontend/src/components/CommentForm.tsx`

#### Changes Needed:

1. **Add State for Media Files**
   ```typescript
   const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
   const fileInputRef = useRef<HTMLInputElement>(null);
   ```

2. **Add File Upload UI**
   - Hidden file input (similar to CreatePostPage)
   - Button to trigger file selection
   - Media preview thumbnails with remove buttons
   - File count limit (suggest 3 max for comments vs 5 for posts)

3. **Add Styled Components**
   ```typescript
   const MediaSection = styled.div`
     // Similar to CreatePostPage MediaSection
   `;

   const MediaPreview = styled.div`
     // Show thumbnail previews
   `;

   const MediaButton = styled.button`
     // Button to add images (small icon button)
   `;
   ```

4. **Update Submit Handler**
   - First create the comment
   - Then upload media files with the new comment ID
   - Handle loading states properly
   - Show errors if media upload fails

5. **Validation Changes**
   - Allow comments with just media (no text), OR
   - Keep text required but allow optional media attachment
   - **Decision needed:** Should comments require text like they currently do?

#### Suggested UI Layout:
```
┌─────────────────────────────────────┐
│ [Text Area]                         │
│ Write a comment...                  │
│                                     │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ [📷] [Preview] [Preview] [Preview]  │ ← Media thumbnails if added
└─────────────────────────────────────┘
         [Cancel] [Comment] ← Buttons
```

### Phase 3: Frontend Comment Display (2 hours)

**Files:**
- `frontend/src/components/PostCard.tsx` (CommentRenderer component)
- Create new `frontend/src/components/CommentMedia.tsx` (optional, for reusability)

#### Changes Needed:

1. **Update CommentRenderer Component**
   - Check if comment has media in response data
   - Display media grid below comment text
   - Use similar MediaGrid component as posts (but smaller)

2. **Add Media Display Components**
   ```typescript
   const CommentMediaGrid = styled.div<{ $count: number }>`
     display: grid;
     gap: 4px;
     margin-top: 8px;
     grid-template-columns: ${({ $count }) =>
       $count === 1 ? '1fr' : 'repeat(2, 1fr)'
     };
     max-width: 300px; // Smaller than post media
   `;

   const CommentMediaItem = styled.div`
     position: relative;
     width: 100%;
     aspect-ratio: 1;
     cursor: pointer;
     border-radius: 4px;
     overflow: hidden;

     img {
       width: 100%;
       height: 100%;
       object-fit: cover;
     }
   `;
   ```

3. **Handle Media Types**
   - Images: Show thumbnails, clickable to open modal
   - Videos: Show thumbnail with play icon overlay
   - Multiple files: Show grid (max 3 visible, "+X more" indicator)

4. **Update Comment Type Definition**
   - File: `frontend/src/types.ts`
   - Add `media?: Media[]` to Comment interface if not already there

### Phase 4: Image Modal for Comments (1 hour)

**File:** `frontend/src/components/PostCard.tsx`

#### Changes Needed:

1. **Extend Existing Modal State**
   ```typescript
   const [showImageModal, setShowImageModal] = useState(false);
   const [currentImageIndex, setCurrentImageIndex] = useState(0);
   const [modalMediaSource, setModalMediaSource] = useState<'post' | 'comment'>('post');
   const [selectedCommentMedia, setSelectedCommentMedia] = useState<Media[]>([]);
   ```

2. **Update Modal Handlers**
   - `openImageModal` should accept source type and media array
   - Modal should work for both post images and comment images
   - Navigation arrows should respect the current media source

3. **Add Click Handlers to Comment Media**
   - When clicking comment image, open modal with comment's media
   - Support navigation between multiple images in same comment

### Phase 5: API Service Updates (30 min)

**File:** `frontend/src/services/api.ts`

#### Verify/Update:

1. **Check Comment Type**
   - Ensure Comment interface includes optional `media` field

2. **Media API**
   - Verify `mediaApi.uploadFiles` accepts `comment_id` parameter
   - Update if needed:
   ```typescript
   uploadFiles: async (data: {
     files: File[];
     post_id?: number;
     comment_id?: number;
   }): Promise<ApiResponse<any>>
   ```

### Phase 6: Testing & Polish (1 hour)

#### Test Cases:

1. **Comment Creation**
   - [ ] Create comment with text only
   - [ ] Create comment with text + 1 image
   - [ ] Create comment with text + multiple images
   - [ ] Create comment with only image (if allowing)
   - [ ] Verify media upload errors are handled
   - [ ] Test file size limits

2. **Comment Display**
   - [ ] Comments with images display correctly
   - [ ] Nested replies with images work
   - [ ] Multiple images show in grid
   - [ ] Images are properly sized/cropped

3. **Image Modal**
   - [ ] Click image opens modal
   - [ ] Navigation works for multiple images
   - [ ] Close modal with X or click outside
   - [ ] ESC key closes modal

4. **Edge Cases**
   - [ ] Very long comment text + images
   - [ ] Large image files
   - [ ] Unsupported file types show error
   - [ ] Network failure during upload
   - [ ] Loading states display correctly

## File Checklist

### Backend Files (Verify)
- [ ] `backend/src/routes/media.js` - Check comment_id support
- [ ] `backend/src/routes/comments.js` - Verify media join query

### Frontend Files (Modify)
- [ ] `frontend/src/components/CommentForm.tsx` - Add file upload
- [ ] `frontend/src/components/PostCard.tsx` - Display comment media + modal
- [ ] `frontend/src/types.ts` - Verify Comment interface
- [ ] `frontend/src/services/api.ts` - Verify mediaApi types

### Optional Files (Create if needed)
- [ ] `frontend/src/components/CommentMedia.tsx` - Reusable component

## Design Decisions to Make

1. **Text Requirement**
   - Should comments with only images be allowed?
   - Current: Text is required (line 134 in CommentForm.tsx)
   - Suggestion: Keep text required OR require at least text OR media

2. **File Limits**
   - How many files per comment? (Suggest: 3 max, vs 5 for posts)
   - Maximum file size per comment? (Same as posts)

3. **UI Size**
   - Comment images should be smaller than post images
   - Suggested: 300px max width for comment media grid

4. **Nested Reply Media**
   - Should deeply nested replies support media?
   - Might get cluttered at depth > 2
   - Suggestion: Allow media at all levels but use smaller thumbnails

5. **Video Support**
   - Should comments support videos or just images?
   - Videos add complexity (playback in small space)
   - Suggestion: Start with images only, add video later

## Estimated Time

- **Phase 1:** 30 minutes (backend verification)
- **Phase 2:** 2 hours (comment form updates)
- **Phase 3:** 2 hours (comment display)
- **Phase 4:** 1 hour (image modal)
- **Phase 5:** 30 minutes (API service)
- **Phase 6:** 1 hour (testing)

**Total: ~7 hours** (one work day)

## Dependencies

- None - all infrastructure exists
- Posts already have media support to copy from
- Media upload API already supports comment_id

## Nice-to-Haves (Future)

1. Drag-and-drop file upload for comments
2. Image editor (crop/rotate) before upload
3. Paste images from clipboard
4. GIF support via GIPHY API
5. Media preview on hover
6. Lazy loading for comment images
7. Image compression before upload

## Notes

- The database schema and backend are already prepared for this feature
- Most code can be adapted from existing post media functionality
- Focus on simple, clean UI that doesn't clutter comment threads
- Consider mobile experience - comment images should work well on small screens

## References

- Post media implementation: `frontend/src/pages/CreatePostPage.tsx`
- Post image display: `frontend/src/components/PostCard.tsx` (lines 838-867)
- Media upload API: `backend/src/routes/media.js`
- Comment queries with media: `backend/src/routes/comments.js` (lines 85-96)
