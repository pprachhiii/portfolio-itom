/**
 * Lead-Generation Form Content
 * Replaces portfolio content with form-step options
 */

export const FORM_STEPS = {
  SPECIALIZATION: {
    title: 'Specialization',
    options: [
      'HR & People Management',
      'Finance & Banking',
      'IT & Technology',
      'Marketing & Sales',
      'Operations & Supply Chain',
      'General Management'
    ]
  },
  BUDGET: {
    title: 'Budget',
    options: [
      'Under ₹1 Lakh',
      '₹1–2 Lakhs',
      '₹2–3 Lakhs',
      '₹3–5 Lakhs',
      '₹5 Lakhs+'
    ]
  },
  EDUCATION: {
    title: 'Education Level',
    options: [
      'Bachelor\'s Degree',
      'Master\'s Degree',
      'Final Year / Awaiting Graduation',
      'Diploma',
      'Other'
    ]
  },
  PROFILE: {
    title: 'Profile Information',
    fields: [
      { id: 'name', label: 'Full Name', type: 'text', required: true },
      { id: 'email', label: 'Email', type: 'email', required: true },
      { id: 'phone', label: 'Phone Number', type: 'tel', required: true },
      { id: 'state', label: 'State', type: 'select', required: true },
      { id: 'city', label: 'City', type: 'select', required: true }
    ]
  }
};

export const STATE_CITY_MAP = {
  'Delhi': ['New Delhi'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik'],
  'Karnataka': ['Bengaluru', 'Mysuru'],
  'Telangana': ['Hyderabad', 'Warangal'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur'],
  'Uttar Pradesh': ['Lucknow', 'Noida', 'Kanpur', 'Agra', 'Varanasi', 'Prayagraj'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai'],
  'West Bengal': ['Kolkata', 'Siliguri']
};
