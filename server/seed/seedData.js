const profile = {
  name: 'Vinit Niwalkar',
  title: 'Full Stack Developer',
  titleAccent: '& AI / Data Science Engineer',
  role: 'Building intelligent, scalable and user-focused digital experiences.',
  tagline:
    'Full Stack Web Developer skilled in the MERN stack with hands-on experience building role-based, full-stack web applications integrating authentication, real-time features, and AI-assisted modules.',
  summary:
    "Building intelligent, scalable and user-focused digital experiences.",
  availability: 'Open to opportunities',
  email: 'vinitniwalkar804@gmail.com',
  photo: 'images/profile/profile.jpg',
  socials: {
    github: 'https://github.com/vinitniwalkar804-design',
    linkedin: 'https://www.linkedin.com/in/vinit-niwalkar-ai'
  }
};

const skills = [
  { category: 'Frontend', name: 'React.js', icon: 'react', order: 1 },
  { category: 'Frontend', name: 'HTML5', icon: 'html', order: 2 },
  { category: 'Frontend', name: 'CSS3', icon: 'css', order: 3 },
  { category: 'Frontend', name: 'Responsive Web Design', icon: 'responsive', order: 4 },
  { category: 'Frontend', name: 'UI/UX Design', icon: 'design', order: 5 },

  { category: 'Backend', name: 'Node.js', icon: 'node', order: 1 },
  { category: 'Backend', name: 'Express.js', icon: 'express', order: 2 },
  { category: 'Backend', name: 'REST APIs', icon: 'api', order: 3 },

  { category: 'Database', name: 'MongoDB', icon: 'mongodb', order: 1 },
  { category: 'Database', name: 'SQL', icon: 'sql', order: 2 },

  { category: 'Programming', name: 'C', icon: 'c', order: 1 },
  { category: 'Programming', name: 'C++', icon: 'cpp', order: 2 },
  { category: 'Programming', name: 'Java', icon: 'java', order: 3 },
  { category: 'Programming', name: 'Python', icon: 'python', order: 4 },
  { category: 'Programming', name: 'JavaScript', icon: 'javascript', order: 5 },
  { category: 'Programming', name: 'SQL', icon: 'sql', order: 6 },

  { category: 'Full Stack', name: 'MERN Stack Development', icon: 'mern', order: 1 },

  { category: 'AI / Data', name: 'Machine Learning', icon: 'ml', order: 1 },
  { category: 'AI / Data', name: 'Generative AI', icon: 'genai', order: 2 },
  { category: 'AI / Data', name: 'Computer Vision (OpenCV)', icon: 'vision', order: 3 },
  { category: 'AI / Data', name: 'Data Science', icon: 'data', order: 4 },

  { category: 'Tools & Concepts', name: 'Data Structures & Algorithms', icon: 'dsa', order: 1 },
  { category: 'Tools & Concepts', name: 'Git & GitHub', icon: 'git', order: 2 },
  { category: 'Tools & Concepts', name: 'Object-Oriented Programming', icon: 'oop', order: 3 },
  { category: 'Tools & Concepts', name: 'Version Control', icon: 'git', order: 4 }
];

const projects = [
  {
    name: 'FindLink',
    subtitle: 'Missing Person Detection & Reunification System',
    tagline:
      'A full-stack MERN application connecting families, citizens, police and administrators to report and manage missing and found person cases through role-based access control.',
    description:
      'FindLink is my major project — a full-stack MERN web app that lets families, citizens, police and administrators report and manage missing and found person cases. Access is controlled by role, and AI-assisted face matching (Python + OpenCV) supports identification while location-based search and real-time case status updates keep everyone informed.',
    featured: true,
    badge: 'Major Project',
    tags: ['React.js', 'Node.js', 'Express.js', 'MongoDB', 'Python', 'OpenCV', 'Authentication'],
    github: 'https://github.com/vinitniwalkar804-design/Findlink',
    liveUrl: '',
    caseStudy: {
      overview:
        'FindLink is a full-stack MERN application that helps families, citizens, police and administrators report, search and manage missing and found person cases. Different user roles see and do different things, so the right people have the right access at every stage of a case.',
      problem:
        'Finding a missing person is stressful and fragmented. Reports live in different places, there is no shared system for citizens, families, police and administrators, and matching a found person with a missing-person report is slow and largely manual.',
      solution:
        'A central, role-based platform where anyone can file or search a report securely. Police and administrators get a structured management flow, and an AI-assisted face-matching module built with Python and OpenCV helps connect found persons to active reports. Location-based search narrows results, and a notification system plus real-time case status updates keep everyone informed as a case progresses.',
      featuredFeatures: [
        'Role-based access control for families, citizens, police and administrators',
        'Authentication-secured reporting and case management',
        'AI-assisted face matching with Python & OpenCV',
        'Location-based search for nearby cases',
        'Notification system and real-time case status updates'
      ],
      techStack: ['React.js', 'Node.js', 'Express.js', 'MongoDB', 'Python', 'OpenCV', 'JWT Authentication'],
      role:
        'Full-stack development of the web application — designing the role-based data flow, building the Express + MongoDB backend, wiring authentication and real-time status updates, and integrating the Python/OpenCV face-matching module with the system.'
    },
    order: 1
  },
  {
    name: 'InterviX-AI',
    subtitle: 'AI-Powered Interview Platform',
    tagline:
      'An AI-powered web platform for interactive mock interviews that also evaluates candidate performance.',
    description:
      'InterviX-AI is an AI-powered web platform for conducting interactive mock interviews and evaluating candidate performance. It pairs a MERN-stack backend with MongoDB-based candidate data management, making interview practice structured and measurable.',
    featured: true,
    badge: 'Featured Project',
    tags: ['React.js', 'Node.js', 'Express.js', 'MongoDB', 'AI Assistant'],
    github: 'https://github.com/vinitniwalkar804-design/InterviX-AI',
    liveUrl: '',
    caseStudy: {
      overview:
        'InterviX-AI is an AI-powered web platform that runs interactive mock interviews and helps evaluate how well a candidate performs, with the MERN stack behind the scenes.',
      problem:
        'Practicing for interviews is usually unstructured — candidates answer questions with no feedback, no evaluation, and no record of how they did over time.',
      solution:
        'InterviX-AI delivers an interactive, AI-assisted interview session, captures candidate responses, and evaluates performance so candidates get structured practice and a clearer picture of their strengths and gaps.',
      featuredFeatures: [
        'Interactive AI-assisted interview sessions',
        'Candidate performance evaluation',
        'Candidate data management',
        'MERN-stack backend',
        'MongoDB persistence'
      ],
      techStack: ['React.js', 'Node.js', 'Express.js', 'MongoDB', 'AI Assistant'],
      role:
        'Full-stack development — building the interview flow with the AI assistant, implementing performance evaluation, and managing candidate data through the Express/MongoDB backend.'
    },
    order: 2
  },
  {
    name: 'CINEMAX',
    subtitle: 'Movie Web Application',
    tagline:
      'A responsive movie browsing application with an interactive, user-friendly interface for exploring movie listings.',
    description:
      'CINEMAX is a responsive movie browsing web application with an interactive, user-friendly interface built with HTML, CSS and JavaScript for exploring movie listings.',
    featured: false,
    badge: '',
    tags: ['HTML5', 'CSS3', 'JavaScript'],
    github: 'https://github.com/vinitniwalkar804-design/CINEMAX',
    liveUrl: '',
    caseStudy: {
      overview:
        'CINEMAX is a responsive movie browsing web application with an interactive, user-friendly interface for exploring movie listings.',
      problem:
        'Browsing movie listings often feels static and cluttered — there is little interactivity and the layout does not adapt well across devices.',
      solution:
        'A clean, responsive interface built with HTML, CSS and JavaScript that makes exploring movie listings interactive, smooth and enjoyable on desktop and mobile alike.',
      featuredFeatures: [
        'Responsive, mobile-first layout',
        'Interactive browsing experience',
        'Clean and user-friendly interface'
      ],
      techStack: ['HTML5', 'CSS3', 'JavaScript'],
      role:
        'Front-end design and development — building the responsive layout, interactions and overall UI using vanilla web technologies.'
    },
    order: 3
  },
  {
    name: 'EduRise',
    subtitle: 'AI-Powered Academic Platform',
    tagline:
      'EduRise is a full-stack AI-powered academic platform built with Node.js, Express.js, MongoDB, JavaScript, JWT, Ollama and Llama 3.2, using RAG to help engineering students learn, practice, manage resources, and track their personal academic growth.',
    description:
      'EduRise is a full-stack AI-powered academic platform built for engineering students to manage academic information, study resources, documents, previous-year questions, quizzes, career preparation, and personal academic growth.',
    featured: false,
    badge: 'Featured Project',
    tags: ['HTML5', 'CSS3', 'JavaScript', 'Node.js', 'Express.js', 'MongoDB', 'JWT', 'Ollama', 'Llama 3.2', 'RAG', 'REST APIs'],
    github: 'https://github.com/vinitniwalkar804-design/EduRise',
    liveUrl: '',
    caseStudy: {
      overview:
        'EduRise is a full-stack AI-powered academic platform for engineering students. It brings academic information, study resources, documents, previous-year questions, quizzes, career preparation and personal learning activities into one secured, organized platform.',
      problem:
        'Engineering students juggle scattered resources — PDFs, notes, previous-year papers, quizzes and career-prep material live in separate places with no single view. Finding answers from old documents is manual and slow, and there is little personalization to a student\u2019s weak topics or learning progress.',
      solution:
        'EduRise centralizes everything on one platform. Students upload PDFs, which are chunked and indexed for RAG-based question answering — the Ollama + Llama 3.2 AI assistant answers questions grounded in their own documents. AI-generated quizzes, previous-year question preparation, weak-topic identification, academic analytics and personalized recommendations turn scattered study material into an adaptive learning loop. JWT authentication and password hashing keep accounts secure, while REST APIs and MongoDB manage the data.',
      featuredFeatures: [
        'AI Assistant using Ollama + Llama 3.2',
        'RAG-based academic document Q&A',
        'PDF upload and text extraction',
        'Document chunking and retrieval',
        'AI-based quiz generation',
        'Previous Year Question (PYQ) preparation',
        'Academic analytics',
        'Weak-topic identification',
        'Personalized recommendations',
        'Academic document search',
        'Student skills, projects, certifications, goals and notes',
        'JWT authentication',
        'MongoDB data management',
        'REST APIs'
      ],
      techStack: ['HTML5', 'CSS3', 'JavaScript', 'Node.js', 'Express.js', 'MongoDB', 'JWT', 'Password Hashing', 'Ollama', 'Llama 3.2', 'RAG', 'REST APIs'],
      role:
        'Designed and developed the platform end-to-end — building the Express.js + MongoDB backend with JWT authentication and password hashing, implementing PDF upload, text extraction, document chunking and retrieval, wiring the Ollama + Llama 3.2 AI assistant with RAG, and building the AI quiz engine, analytics and personalized recommendation features.'
    },
    order: 4
  }
];

const experience = [
  {
    title: 'Python Full Stack Developer Virtual Internship',
    organization: 'EduSkills',
    type: 'Virtual Internship',
    period: '',
    description:
      'Hands-on virtual internship covering Python-based full-stack development workflows.',
    tags: ['Python', 'Full Stack'],
    order: 1
  },
  {
    title: 'AI/ML Virtual Internship',
    organization: 'EduSkills',
    type: 'Virtual Internship',
    period: '',
    description: 'Virtual internship focused on AI and machine learning fundamentals and applied practice.',
    tags: ['AI', 'Machine Learning'],
    order: 2
  },
  {
    title: 'Generative AI',
    organization: 'EduSkills',
    type: 'Internship',
    period: '',
    description: 'Internship program focused on Generative AI concepts and modern AI tooling.',
    tags: ['Generative AI', 'AI'],
    order: 3
  },
  {
    title: 'Zscaler Virtual Internship',
    organization: 'EduSkills',
    type: 'Virtual Internship',
    period: '',
    description: 'Virtual internship with Zscaler through EduSkills covering cloud security concepts.',
    tags: ['Cloud Security'],
    order: 4
  },
  {
    title: 'Web Exploit Hunting & Bug Bounty',
    organization: 'EduSkills',
    type: 'Virtual Internship',
    period: '',
    description: 'Virtual internship introducing web security, exploit hunting and bug bounty fundamentals.',
    tags: ['Web Security', 'Bug Bounty'],
    order: 5
  }
];

const education = [
  {
    degree: 'Bachelor of Technology (B.Tech)',
    field: 'Artificial Intelligence & Data Science',
    institution: 'P. R. Pote Patil College of Engineering & Management, Amravati',
    period: 'Expected Graduation 2028',
    detail: 'CGPA: 8.7 / 10',
    order: 1
  },
  {
    degree: 'Higher Secondary Certificate (HSC)',
    field: 'Maharashtra State Board',
    institution: 'Maharashtra State Board',
    period: '',
    detail: '72%',
    order: 2
  },
  {
    degree: 'Secondary School Certificate (SSC)',
    field: 'Maharashtra State Board',
    institution: 'Maharashtra State Board',
    period: '',
    detail: '80%',
    order: 3
  }
];

const certificates = [
  {
    title: 'Generative AI',
    provider: 'EduSkills',
    category: 'AI / ML',
    icon: 'genai',
    order: 1
  },
  {
    title: 'Soft Skills',
    provider: 'NPTEL',
    category: 'Professional Skills',
    icon: 'soft',
    order: 2
  },
  {
    title: 'Python 3.4.3 Training',
    provider: 'Spoken Tutorial, IIT Bombay',
    category: 'Programming',
    icon: 'python',
    order: 3
  },
  {
    title: 'AI for Beginners',
    provider: 'HP LIFE',
    category: 'AI Foundation',
    icon: 'ai',
    order: 4
  },
  {
    title: 'Getting Started with AI',
    provider: 'IBM SkillsBuild',
    category: 'AI Foundation',
    icon: 'ai',
    order: 5
  }
];

module.exports = { profile, skills, projects, experience, education, certificates };