let minDate = new Date('2020-01-01');
let maxDate = new Date('2025-12-31');
let currentStartDate = minDate;
let currentEndDate = maxDate;
let timelineMode = 'all';
let isPlaying = false;
let playInterval = null;
let allFeatures = [];

export function initTimeline() {
  initTimelineControls();
  bindTimelineEvents();
}

export function updateTimelineData(features) {
  allFeatures = features;
  calculateDateRange(features);
  updateTimelineSliders();
  updateTimelineLabels();
}

function initTimelineControls() {
  const timelineContainer = document.getElementById('timeline-container');
  const timelineMode = document.getElementById('timeline-mode');
  
  // Initially hide timeline controls
  timelineContainer.style.display = 'none';
  
  // Show controls when mode is changed from 'all'
  timelineMode.addEventListener('change', (e) => {
    const showTimeline = e.target.value !== 'all';
    timelineContainer.style.display = showTimeline ? 'block' : 'none';
    
    if (!showTimeline) {
      // Reset timeline when switching back to 'all'
      resetTimeline();
    }
  });
}

function bindTimelineEvents() {
  // Mode selection
  document.getElementById('timeline-mode').addEventListener('change', handleModeChange);
  
  // Slider events
  document.getElementById('timeline-start').addEventListener('input', handleSliderChange);
  document.getElementById('timeline-end').addEventListener('input', handleSliderChange);
  
  // Control buttons
  document.getElementById('timeline-play').addEventListener('click', togglePlayback);
  document.getElementById('timeline-reset').addEventListener('click', resetTimeline);
  document.getElementById('timeline-speed').addEventListener('change', updatePlaybackSpeed);
}

function calculateDateRange(features) {
  const dates = [];
  
  features.forEach(f => {
    const props = f.properties;
    if (props.startDate) {
      dates.push(new Date(props.startDate));
    }
    if (props.endDate) {
      dates.push(new Date(props.endDate));
    }
  });
  
  if (dates.length > 0) {
    dates.sort((a, b) => a - b);
    minDate = dates[0];
    maxDate = dates[dates.length - 1];
    
    // Add padding
    const padding = (maxDate - minDate) * 0.1;
    minDate = new Date(minDate.getTime() - padding);
    maxDate = new Date(maxDate.getTime() + padding);
  } else {
    // Fallback dates
    minDate = new Date('2020-01-01');
    maxDate = new Date('2025-12-31');
  }
  
  currentStartDate = minDate;
  currentEndDate = maxDate;
}

function updateTimelineSliders() {
  const startSlider = document.getElementById('timeline-start');
  const endSlider = document.getElementById('timeline-end');
  
  startSlider.value = 0;
  endSlider.value = 100;
  
  updateTimelineRange();
}

function updateTimelineLabels() {
  const minLabel = document.getElementById('timeline-min-label');
  const maxLabel = document.getElementById('timeline-max-label');
  const startValue = document.getElementById('timeline-start-value');
  const endValue = document.getElementById('timeline-end-value');
  
  minLabel.textContent = formatDateLabel(minDate);
  maxLabel.textContent = formatDateLabel(maxDate);
  startValue.textContent = formatDateValue(currentStartDate);
  endValue.textContent = formatDateValue(currentEndDate);
}

function handleModeChange(e) {
  timelineMode = e.target.value;
  
  // Trigger filter update
  document.dispatchEvent(new CustomEvent('timeline-filter-changed'));
}

function handleSliderChange() {
  const startSlider = document.getElementById('timeline-start');
  const endSlider = document.getElementById('timeline-end');
  
  let startPercent = parseInt(startSlider.value);
  let endPercent = parseInt(endSlider.value);
  
  // Ensure start is always before end
  if (startPercent > endPercent) {
    if (startSlider === document.activeElement) {
      endPercent = startPercent;
      endSlider.value = endPercent;
    } else {
      startPercent = endPercent;
      startSlider.value = startPercent;
    }
  }
  
  // Calculate actual dates
  const totalTime = maxDate.getTime() - minDate.getTime();
  const startTime = minDate.getTime() + (totalTime * startPercent / 100);
  const endTime = minDate.getTime() + (totalTime * endPercent / 100);
  
  currentStartDate = new Date(startTime);
  currentEndDate = new Date(endTime);
  
  // Update UI
  updateTimelineRange();
  updateTimelineValues();
  
  // Trigger filter update
  document.dispatchEvent(new CustomEvent('timeline-filter-changed'));
}

function updateTimelineRange() {
  const startSlider = document.getElementById('timeline-start');
  const endSlider = document.getElementById('timeline-end');
  const rangeElement = document.getElementById('timeline-range');
  
  const startPercent = parseInt(startSlider.value);
  const endPercent = parseInt(endSlider.value);
  
  rangeElement.style.left = startPercent + '%';
  rangeElement.style.width = (endPercent - startPercent) + '%';
}

function updateTimelineValues() {
  const startValue = document.getElementById('timeline-start-value');
  const endValue = document.getElementById('timeline-end-value');
  
  startValue.textContent = formatDateValue(currentStartDate);
  endValue.textContent = formatDateValue(currentEndDate);
}

function togglePlayback() {
  const playBtn = document.getElementById('timeline-play');
  
  if (isPlaying) {
    stopPlayback();
    playBtn.innerHTML = '▶️ Play';
    playBtn.classList.remove('playing');
  } else {
    startPlayback();
    playBtn.innerHTML = '⏸️ Pause';
    playBtn.classList.add('playing');
  }
}

function startPlayback() {
  isPlaying = true;
  const speed = getPlaybackSpeed();
  
  playInterval = setInterval(() => {
    const startSlider = document.getElementById('timeline-start');
    const endSlider = document.getElementById('timeline-end');
    
    let currentStart = parseInt(startSlider.value);
    let currentEnd = parseInt(endSlider.value);
    
    // Move the window forward
    const windowSize = currentEnd - currentStart;
    const step = Math.max(1, Math.floor(100 / speed));
    
    currentStart += step;
    currentEnd = currentStart + windowSize;
    
    // Check if we've reached the end
    if (currentEnd >= 100) {
      currentStart = 0;
      currentEnd = windowSize;
    }
    
    startSlider.value = currentStart;
    endSlider.value = currentEnd;
    
    handleSliderChange();
    
  }, speed);
}

function stopPlayback() {
  isPlaying = false;
  if (playInterval) {
    clearInterval(playInterval);
    playInterval = null;
  }
}

function updatePlaybackSpeed() {
  if (isPlaying) {
    stopPlayback();
    startPlayback();
  }
}

function getPlaybackSpeed() {
  const speedSelect = document.getElementById('timeline-speed');
  const speeds = {
    'slow': 1000,
    'normal': 500,
    'fast': 200
  };
  return speeds[speedSelect.value] || speeds.normal;
}

function resetTimeline() {
  stopPlayback();
  
  const playBtn = document.getElementById('timeline-play');
  playBtn.innerHTML = '▶️ Play';
  playBtn.classList.remove('playing');
  
  const startSlider = document.getElementById('timeline-start');
  const endSlider = document.getElementById('timeline-end');
  
  startSlider.value = 0;
  endSlider.value = 100;
  
  currentStartDate = minDate;
  currentEndDate = maxDate;
  
  updateTimelineRange();
  updateTimelineValues();
  
  // Trigger filter update
  document.dispatchEvent(new CustomEvent('timeline-filter-changed'));
}

export function getTimelineFilter() {
  if (timelineMode === 'all') {
    return null;
  }
  
  return {
    mode: timelineMode,
    startDate: currentStartDate,
    endDate: currentEndDate
  };
}

export function applyTimelineFilter(features) {
  const filter = getTimelineFilter();
  
  if (!filter) {
    return features;
  }
  
  return features.filter(feature => {
    const props = feature.properties;
    const startDate = props.startDate ? new Date(props.startDate) : null;
    const endDate = props.endDate ? new Date(props.endDate) : null;
    
    switch (filter.mode) {
      case 'start':
        return startDate && 
               startDate >= filter.startDate && 
               startDate <= filter.endDate;
      
      case 'end':
        return endDate && 
               endDate >= filter.startDate && 
               endDate <= filter.endDate;
      
      case 'active':
        // Project is active if it starts before filter end and ends after filter start
        if (!startDate || !endDate) {
          // If missing dates, include in active filter for now
          return true;
        }
        return startDate <= filter.endDate && endDate >= filter.startDate;
      
      default:
        return true;
    }
  });
}

function formatDateLabel(date) {
  return date.getFullYear().toString();
}

function formatDateValue(date) {
  return date.toISOString().split('T')[0];
}

// Cleanup function for when the component is destroyed
export function destroyTimeline() {
  stopPlayback();
}