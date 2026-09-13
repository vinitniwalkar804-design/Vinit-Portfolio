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
      architecture:
        'Three-tier design: a React client, an Express REST API, and a MongoDB data layer. JWT authentication gates role-specific views for citizens, families, police and administrators, while the Python + OpenCV face-matching module runs as a service the backend calls when comparing reports.',
      featuredFeatures: [
        'Role-based access control for families, citizens, police and administrators',
        'Authentication-secured reporting and case management',
        'AI-assisted face matching with Python & OpenCV',
        'Location-based search for nearby cases',
        'Notification system and real-time case status updates'
      ],
      techStack: ['React.js', 'Node.js', 'Express.js', 'MongoDB', 'Python', 'OpenCV', 'JWT Authentication'],
      role:
        'Full-stack development of the web application — designing the role-based data flow, building the Express + MongoDB backend, wiring authentication and real-time status updates, and integrating the Python/OpenCV face-matching module with the system.',
      impact:
        'Brings missing-person reporting, searching and case tracking onto a single shared platform, giving families, police and administrators one structured flow and replacing fragmented, largely manual matching.'
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
      architecture:
        'MERN three-tier structure — a React frontend drives the interactive interview session, the Express REST API orchestrates the AI-assistant conversation, and MongoDB persists candidate profiles, answers and evaluation results.',
      featuredFeatures: [
        'Interactive AI-assisted interview sessions',
        'Candidate performance evaluation',
        'Candidate data management',
        'MERN-stack backend',
        'MongoDB persistence'
      ],
      techStack: ['React.js', 'Node.js', 'Express.js', 'MongoDB', 'AI Assistant'],
      role:
        'Full-stack development — building the interview flow with the AI assistant, implementing performance evaluation, and managing candidate data through the Express/MongoDB backend.',
      impact:
        'Turns unstructured interview practice into a structured, measurable loop — candidates receive evaluated feedback and keep a persistent record of how they performed over time.'
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
    badge: 'Web App',
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
      architecture:
        'A two-tier frontend application — semantic HTML, modern CSS and vanilla JavaScript render the movie listings with an interactive, responsive UI and no backend dependency.',
      featuredFeatures: [
        'Responsive, mobile-first layout',
        'Interactive browsing experience',
        'Clean and user-friendly interface'
      ],
      techStack: ['HTML5', 'CSS3', 'JavaScript'],
      role:
        'Front-end design and development — building the responsive layout, interactions and overall UI using vanilla web technologies.',
      impact:
        'A lightweight, dependency-free browsing experience that stays smooth and readable across desktop and mobile.'
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
      architecture:
        'Layered full-stack design: an Express.js + MongoDB backend with JWT authentication and password hashing, a REST API for the client, a PDF upload + text-extraction + chunking pipeline, and an Ollama + Llama 3.2 AI service with RAG that answers questions grounded only in the student\u2019s uploaded documents.',
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
        'Designed and developed the platform end-to-end — building the Express.js + MongoDB backend with JWT authentication and password hashing, implementing PDF upload, text extraction, document chunking and retrieval, wiring the Ollama + Llama 3.2 AI assistant with RAG, and building the AI quiz engine, analytics and personalized recommendation features.',
      impact:
        'Consolidates scattered study material into one secure platform — RAG-grounded document Q&A, AI quizzes and weak-topic analytics turn static resources into an adaptive, personal learning loop.'
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
    title: 'Getting Started with Cybersecurity',
    provider: 'IBM SkillsBuild',
    category: 'Cybersecurity',
    icon: 'cyber',
    order: 0,
    issuedAt: 'Aug 17, 2026',
    credentialUrl: 'https://www.credly.com/badges/d2e26920-0fa8-482d-9acc-14ffec862f0d',
    file: '/certificates/getting-started-cybersecurity-ibm.pdf'
  },
  {
    title: 'SQL and Database Management Systems Virtual Internship',
    provider: 'EduSkills / AICTE',
    category: 'Database',
    icon: 'sql',
    order: 0,
    issuedAt: 'Aug 17, 2026',
    certificateId: '2026-0FE3CE90E3',
    file: '/certificates/sql-dbms-eduskills.pdf'
  },
  {
    title: 'Ethical Hacking Virtual Internship (Hindi)',
    provider: 'EduSkills / AICTE',
    category: 'Cybersecurity',
    icon: 'ethical',
    order: 0,
    issuedAt: 'Mar 18, 2026',
    certificateId: '2026-EFC6148D9C',
    file: '/certificates/ethical-hacking-eduskills.pdf'
  },
  {
    title: 'Python Full Stack Developer Virtual Internship',
    provider: 'EduSkills',
    category: 'Full Stack Development',
    icon: 'python',
    order: 1,
    file: '/certificates/Python full stack certificate by Eduskills.pdf'
  },
  {
    title: 'AI-ML Virtual Internship',
    provider: 'EduSkills / Google for Developers',
    category: 'AI / ML',
    icon: 'ml',
    order: 2,
    file: '/certificates/ai-ml-eduskills.pdf'
  },
  {
    title: 'Generative AI Virtual Internship',
    provider: 'EduSkills / Google Cloud',
    category: 'Generative AI',
    icon: 'genai',
    order: 3,
    file: '/certificates/generative-ai-eduskills.pdf'
  },
  {
    title: 'Networking Virtual Internship',
    provider: 'EduSkills / Zscaler',
    category: 'Cloud / Networking',
    icon: 'zscaler',
    order: 4,
    file: '/certificates/networking-zscaler.pdf'
  },
  {
    title: 'Web Exploit Hunting and Bug Bounty Virtual Internship',
    provider: 'EduSkills',
    category: 'Cybersecurity',
    icon: 'bugbounty',
    order: 5,
    file: '/certificates/web-exploit-bug-bounty-eduskills.pdf'
  },
  {
    title: 'Soft Skills',
    provider: 'NPTEL',
    category: 'Professional Skills',
    icon: 'soft',
    order: 6,
    file: '/certificates/Soft Skill Development certificate by NPTEL.pdf'
  },
  {
    title: 'Python 3.4.3 Training',
    provider: 'Spoken Tutorial, IIT Bombay',
    category: 'Programming',
    icon: 'python',
    order: 7,
    file: '/certificates/VINIT-NIWALKAR-Participant-Certificate.pdf'
  },
  {
    title: 'AI for Beginners',
    provider: 'HP LIFE',
    category: 'AI / ML',
    icon: 'ai',
    order: 8,
    file: '/certificates/ai-for-beginners-hp-life.pdf'
  },
  {
    title: 'Getting Started with Artificial Intelligence',
    provider: 'IBM SkillsBuild',
    category: 'AI / ML',
    icon: 'ai',
    order: 9,
    file: '/certificates/getting-started-ai-ibm.pdf'
  },
  {
    title: 'Java Training',
    provider: 'Spoken Tutorial / EduPyramids / IIT Bombay',
    category: 'Programming',
    icon: 'java',
    order: 10,
    file: '/certificates/java-training-iit-bombay.pdf'
  }
];

module.exports = { profile, skills, projects, experience, education, certificates };