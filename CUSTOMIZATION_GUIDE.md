# Portfolio Customization Guide

## 🎯 Quick Start Checklist

### 1. Personal Information
Replace these placeholders in `index.html`:
- `[YOUR_NAME]` - Your full name
- `[YOUR_FIRST_NAME]` - Your first name  
- `[YOUR_LAST_NAME]` - Your last name
- `[YOUR_TITLE]` - Your professional title (e.g., "Full Stack Developer")
- `[YOUR_EMAIL]` - Your email address
- `[YOUR_LOCATION]` - Your city, country
- `[YOUR_BIO_DESCRIPTION]` - Write 2-3 sentences about yourself
- `[YOUR_RESUME_URL]` - Link to your resume (Google Drive, etc.)

### 2. Social Media Links
Update these URLs in `index.html`:
- `[YOUR_LINKEDIN_URL]` - Your LinkedIn profile
- `[YOUR_GITHUB_USERNAME]` - Your GitHub username
- `[YOUR_TWITTER_URL]` - Your Twitter profile (or remove if not needed)
- `[YOUR_TELEGRAM_URL]` - Your Telegram (or remove if not needed)
- `[YOUR_INSTAGRAM_URL]` - Your Instagram (or remove if not needed)
- `[YOUR_DEV_URL]` - Your Dev.to profile (or remove if not needed)

### 3. Skills (skills.json)
Edit `skills.json` to include your technical skills. Each skill needs:
```json
{
    "name": "Skill Name",
    "icon": "Icon URL from icons8.com or similar"
}
```

### 4. Education Section
Update the education section in `index.html`:
- Replace college/university information
- Update degree details
- Change graduation years
- Replace education images in `assets/images/educat/`

### 5. Experience Section
Update your work experience in `index.html`:
- Company names
- Job titles
- Employment dates
- Job descriptions

### 6. Projects
Edit `projects/projects.json` to showcase your projects:
```json
{
    "name": "Project Name",
    "desc": "Project description",
    "image": "image_filename",
    "category": "mern|android|basicweb|lamp",
    "links": {
        "view": "Live demo URL",
        "code": "GitHub repository URL"
    }
}
```

### 7. Images to Replace
- `assets/images/hero.png` - Main hero image
- `assets/images/profile2.jpg` - About section profile photo
- `assets/images/favicon.png` - Website favicon
- `assets/images/projects/` - Add your project screenshots
- `assets/images/educat/` - Add your education institution photos

### 8. Footer Information
Update footer contact info and social links to match your details.

## 🚀 Next Steps
1. Replace all placeholder text with your information
2. Update skills.json with your technical skills
3. Add your project details to projects/projects.json
4. Replace images with your own photos and project screenshots
5. Test the website locally
6. Deploy to GitHub Pages, Netlify, or your preferred hosting

## 📝 Tips
- Keep descriptions concise and professional
- Use high-quality images (recommended: 1920x1080 for hero, 400x400 for profile)
- Test all links before deploying
- Consider removing social media links you don't use
- Update the README.md with your project information