# WebGIS - Infrastructure Project Management System

A comprehensive web-based Geographic Information System (GIS) application for managing and visualizing infrastructure projects. Built with vanilla HTML, CSS, and JavaScript - no backend required!

## 🌟 Features

### 📍 Interactive Map View
- **OpenStreetMap Integration**: Display projects on an interactive Leaflet map
- **Custom Markers**: Color-coded markers based on project status
- **Marker Clustering**: Automatic clustering for better performance with many projects
- **Add Project on Map**: Click directly on map to add new projects with automatic coordinate capture
- **Search & Filter**: Search projects by name, location, or contractor
- **Layer Controls**: Toggle project types visibility
- **Interactive Popups**: Click markers to view project details with edit capabilities
- **Temporary Layers**: Load GeoJSON/Shapefile layers for quick visualization without database import
- **GeoJSON/Shapefile Import**: Import spatial data directly into the database
- **GeoJSON Export**: Export all projects as GeoJSON format

### 📊 Database Management
- **Data Grid**: Comprehensive table view of all projects
- **CRUD Operations**: Create, Read, Update, and Delete projects
- **Dynamic Project Types**: Automatically reads project types from imported data (no predefined categories)
- **Advanced Filtering**: Filter by type, status, date range, location, and contractor
- **Sorting**: Sort by any column (ascending/descending)
- **Pagination**: Navigate through large datasets (20 rows per page)
- **Import Data**: Import from CSV or Excel files with automatic type detection
- **Export Data**: Export to Excel, CSV, or GeoJSON formats

### 📄 Report Management
- **Create Reports**: Generate detailed project reports
- **Rich Text Editor**: Write formatted descriptions
- **Related Projects**: Link multiple projects to a report
- **Attachments**: Upload and manage images and PDFs (up to 10MB each)
- **PDF Export**: Export reports to professional PDF documents
- **Auto-save**: Automatic draft saving every 30 seconds

## 🚀 Getting Started

### Quick Start
1. Download all files to a folder
2. Open `index.html` in a modern web browser
3. That's it! The app runs entirely in your browser

### Files Structure
```
webGIS v1/
├── index.html          # Main HTML structure
├── styles.css          # All styling and responsive design
├── app.js             # Main application controller
├── data-manager.js    # Data storage and localStorage operations
├── map-handler.js     # Leaflet map integration
├── table-handler.js   # Database table operations
├── report-handler.js  # Report management
├── utils.js           # Utility functions
└── README.md          # This file
```

## 📱 Browser Compatibility

Works on all modern browsers:
- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

Requires JavaScript enabled and supports ES6+.

## 💾 Data Storage

All data is stored locally in your browser using `localStorage`:
- **Projects**: Infrastructure project details
- **Reports**: Report content, attachments, and metadata
- **Persistence**: Data persists across browser sessions
- **Capacity**: Typically 5-10MB (browser dependent)

### Backup & Restore
Use the App Info dialog (Ctrl/Cmd + I) to:
- **Backup**: Export all data to JSON file
- **Restore**: Import data from backup file
- **Clear**: Delete all data (with confirmation)

## 🎨 User Interface

### Navigation
Three main views accessible via tab navigation:
1. **Map View**: Interactive map with project markers
2. **Database**: Table view with filtering and CRUD operations
3. **Reports**: Report management with PDF export

### Keyboard Shortcuts
- `Ctrl/Cmd + N`: New Project (in Database view)
- `Ctrl/Cmd + I`: Show App Info
- `Escape`: Close Modal dialogs

## 📐 Project Data Schema

Each project contains:
```javascript
{
  id: "unique-uuid",
  projectName: "Highway Extension Project",
  projectType: "Road", // Can be ANY custom category - not limited to predefined types
  location: "Downtown District, City Name",
  latitude: -6.2088,
  longitude: 106.8456,
  status: "Planning|In Progress|Completed|On Hold|Cancelled",
  startDate: "2024-01-15",
  finishDate: "2025-06-30",
  contractor: "ABC Construction Ltd"
}
```

**Note**: Project types are now **fully dynamic** - you can use any category name you want! The system automatically:
- Reads types from imported CSV/Excel files
- Suggests existing types when adding new projects (using HTML5 datalist)
- Updates filter dropdowns with all unique types
- Updates map layer controls with all types

## 📊 Report Data Schema

Each report contains:
```javascript
{
  id: "unique-uuid",
  title: "Monthly Progress Report",
  date: "2024-10-28",
  author: "John Doe",
  description: "Detailed description...",
  relatedProjects: ["project-id-1", "project-id-2"],
  attachments: [
    {
      id: "attachment-id",
      name: "photo.jpg",
      type: "image/jpeg",
      data: "base64-encoded-data",
      size: 123456
    }
  ],
  createdAt: "2024-10-28T10:30:00Z"
}
```

## 🎯 Key Features Explained

### Map View
- **Base Map**: OpenStreetMap tiles
- **Marker Colors**:
  - 🟢 Green: Completed
  - 🔵 Blue: In Progress
  - 🟡 Yellow: Planning
  - 🔴 Red: On Hold
  - ⚫ Gray: Cancelled
- **Clustering**: Automatically groups nearby markers
- **Search**: Real-time search with 300ms debounce

### Database View
- **Validation**: All fields validated before saving
- **Filter Panel**: Collapsible filter section
- **Multi-select**: Hold Ctrl/Cmd for multiple selections
- **Export Options**: Excel, CSV, or GeoJSON
- **Import Support**: CSV and Excel (.xlsx, .xls)

### Reports View
- **Sidebar Navigation**: Browse all reports
- **Rich Content**: Multi-line descriptions
- **Project Links**: Associate multiple projects
- **File Attachments**: Images and PDFs
- **PDF Generation**: Simple PDF report export

## 🔧 Technical Details

### External Libraries (CDN)
- **Leaflet 1.9.4**: Interactive maps
- **Leaflet.markercluster 1.5.3**: Marker clustering
- **SheetJS (xlsx) 0.18.5**: Excel import/export
- **shpjs 4.0.4**: Shapefile to GeoJSON conversion
- **jsPDF 2.5.1**: PDF generation
- **Font Awesome 6.4.0**: Icons

### Performance Optimizations
- Debounced search inputs (300ms)
- Document fragments for large lists
- Event delegation for dynamic elements
- Lazy map initialization
- Marker clustering for performance

## 🛡️ Security & Privacy

- **No Server**: Everything runs locally in your browser
- **No Tracking**: No analytics or external tracking
- **Privacy**: Your data never leaves your device
- **XSS Protection**: All user input is escaped
- **File Size Limits**: 10MB per attachment

## 🔍 Troubleshooting

### Map Not Loading
- Check internet connection (map tiles require online access)
- Ensure browser allows third-party resources
- Check browser console for errors

### Storage Full
- Delete old projects or reports
- Remove large attachments
- Export data and clear storage
- Typical storage: 5-10MB depending on browser

### Import Errors
- Ensure CSV/Excel has correct column names
- Check data format matches schema
- Validate coordinates (lat: -90 to 90, lng: -180 to 180)
- Ensure dates are in YYYY-MM-DD format

### Using Custom Project Types
1. **Import**: Simply include any category name in the `projectType` column of your CSV/Excel file
2. **Manual Entry**: Type any category name when adding a project - existing types will be suggested
3. **Autocomplete**: The form shows a dropdown of existing types, but you can type new ones
4. **Filters**: Filter dropdowns automatically update with all unique types
5. **Map Controls**: Layer toggles dynamically show all project types

**Example Custom Types:**
- Aviation, Railway, Healthcare, Renewable Energy
- Maritime, Education, Environmental, Technology
- Or ANY category that fits your projects!

### Using Temporary Layers
The **Temporary Layers** feature allows visualization of spatial data without database import:

**When to Use:**
- Quick data exploration before importing
- Comparing external datasets with your projects
- Loading reference layers (boundaries, contours, etc.)
- Viewing spatial data that doesn't need to be in the database

**How to Use:**
1. Click **"Load Temporary Layer"** in the Map Data section
2. Select a GeoJSON or Shapefile (.shp/.zip)
3. Layer appears on map with purple styling
4. **Layers persist across page refreshes** (saved in localStorage)
5. Manage layers in the "Temporary Layers" panel:
   - Toggle visibility (eye icon)
   - Remove individual layers (trash icon)
   - Clear all temporary layers

**Key Differences:**
- **Persistent**: Saved in localStorage, restored on page refresh
- **Separate Storage**: Not in the project database
- **Not in Tables**: Won't appear in database view
- **Not in Reports**: Excluded from reports and analytics
- **View Only**: Cannot edit or delete features
- **Purple Style**: Distinct dashed styling

## 🎨 Customization

### Colors
Edit CSS variables in `styles.css`:
```css
:root {
    --primary: #2563eb;
    --success: #10b981;
    --warning: #f59e0b;
    --danger: #ef4444;
    --background: #f9fafb;
    --text: #1f2937;
}
```

### Map Center
Edit initial coordinates in `map-handler.js`:
```javascript
map = L.map('map').setView([-6.200, 106.816], 11);
```

### Rows Per Page
Edit pagination in `table-handler.js`:
```javascript
const rowsPerPage = 20; // Change to your preference
```

### Validation Rules

### Projects
- **Project Name**: 3-100 characters (required)
- **Project Type**: Any non-empty text up to 50 characters (required) - **accepts custom categories!**
- **Location**: 5-200 characters (required)
- **Latitude**: -90 to 90 (required)
- **Longitude**: -180 to 180 (required)
- **Status**: Must be from predefined list (required)
- **Start Date**: Valid date (required)
- **Finish Date**: Must be after start date (optional)
- **Contractor**: 2-100 characters (required)

### Reports
- **Title**: 3+ characters (required)
- **Date**: Valid date (required)
- **Author**: 2+ characters (required)
- **Description**: 10+ characters (required)
- **Related Projects**: Optional
- **Attachments**: Max 10MB per file

## 🌐 Offline Support

The application works offline after initial load:
- ✅ View existing data
- ✅ Add/edit/delete projects
- ✅ Create reports
- ✅ Export data
- ❌ Map tiles (requires internet)
- ❌ External libraries (cached after first load)

## 🚧 Future Enhancements

Potential improvements:
- [ ] Drawing tools for polygon/line features
- [ ] Advanced spatial queries
- [ ] Custom map styles
- [ ] Multi-user collaboration
- [ ] Backend API integration
- [ ] Mobile app (PWA)
- [ ] Real-time data sync
- [ ] Advanced analytics dashboard

## 📄 License

This project is provided as-is for educational and commercial use.

## 👥 Credits

**Built with:**
- Leaflet.js - Interactive maps
- OpenStreetMap - Map tiles
- SheetJS - Excel processing
- jsPDF - PDF generation
- Font Awesome - Icons

## 📧 Support

For issues or questions:
1. Check browser console for errors
2. Verify all files are in the same directory
3. Ensure using a modern browser
4. Clear browser cache and reload

## 🎓 Usage Tips

1. **Start with Map View**: Get an overview of all projects
2. **Use Filters**: Narrow down data in database view
3. **Export Regularly**: Backup your data periodically
4. **Mobile Access**: Responsive design works on phones/tablets
5. **Keyboard Shortcuts**: Speed up your workflow
6. **Monitor Storage**: Keep an eye on localStorage usage

## 🔄 Updates & Maintenance

To update the application:
1. Export your data (backup)
2. Replace files with new versions
3. Open in browser
4. Import your data (restore)

---

**Version**: 1.1  
**Last Updated**: October 28, 2025  
**Status**: Production Ready ✅

Enjoy using WebGIS BY 13wejay! 🗺️
