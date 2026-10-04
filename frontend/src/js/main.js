/* ==========================================================================
   Vinit Niwalkar — Portfolio frontend
   Vanilla JS · DB-driven content with graceful local fallback
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const esc = (v) =>
    String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));

  function toast(message, type) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('is-error', type === 'error');
    el.classList.add('is-visible');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('is-visible'), 3200);
  }

  async function fetchJSON(url, opts = {}) {
    const { timeoutMs = 4500, method = 'GET', body } = opts;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const init = { signal: ctrl.signal, method, headers: { Accept: 'application/json' } };
      if (body) {
        init.headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(body);
      }
      const res = await fetch(url, init);
      let data = null;
      try {
        data = await res.json();
      } catch (_) {
        data = null;
      }
      return { ok: res.ok, status: res.status, data };
    } finally {
      clearTimeout(timer);
    }
  }

  /* ---------- fallback content (used if the API / DB is unavailable) ---------- */
  const FALLBACK = {
    profile: {
      name: 'Vinit Niwalkar',
      title: 'Full Stack Developer',
      titleAccent: '& AI / Data Science Engineer',
      role: 'Building intelligent, scalable and user-focused digital experiences.',
      tagline:
        'Full Stack Web Developer skilled in the MERN stack with hands-on experience building role-based, full-stack web applications integrating authentication, real-time features, and AI-assisted modules.',
      availability: 'Open to opportunities',
      email: 'vinitniwalkar804@gmail.com',
      photo: 'images/profile/profile.jpg',
      socials: {
        github: 'https://github.com/vinitniwalkar804-design',
        linkedin: 'https://www.linkedin.com/in/vinit-niwalkar-ai'
      }
    },
    skills: [
      { category: 'Frontend', name: 'React.js', icon: 'react' },
      { category: 'Frontend', name: 'HTML5', icon: 'html' },
      { category: 'Frontend', name: 'CSS3', icon: 'css' },
      { category: 'Frontend', name: 'Responsive Web Design', icon: 'responsive' },
      { category: 'Frontend', name: 'UI/UX Design', icon: 'design' },
      { category: 'Backend', name: 'Node.js', icon: 'node' },
      { category: 'Backend', name: 'Express.js', icon: 'express' },
      { category: 'Backend', name: 'REST APIs', icon: 'api' },
      { category: 'Database', name: 'MongoDB', icon: 'mongodb' },
      { category: 'Database', name: 'SQL', icon: 'sql' },
      { category: 'Programming', name: 'C', icon: 'c' },
      { category: 'Programming', name: 'C++', icon: 'cpp' },
      { category: 'Programming', name: 'Java', icon: 'java' },
      { category: 'Programming', name: 'Python', icon: 'python' },
      { category: 'Programming', name: 'JavaScript', icon: 'javascript' },
      { category: 'Programming', name: 'SQL', icon: 'sql' },
      { category: 'Full Stack', name: 'MERN Stack Development', icon: 'mern' },
      { category: 'AI / Data', name: 'Machine Learning', icon: 'ml' },
      { category: 'AI / Data', name: 'Generative AI', icon: 'genai' },
      { category: 'AI / Data', name: 'Computer Vision (OpenCV)', icon: 'vision' },
      { category: 'AI / Data', name: 'Data Science', icon: 'data' },
      { category: 'Tools & Concepts', name: 'Data Structures & Algorithms', icon: 'dsa' },
      { category: 'Tools & Concepts', name: 'Git & GitHub', icon: 'git' },
      { category: 'Tools & Concepts', name: 'Object-Oriented Programming', icon: 'oop' },
      { category: 'Tools & Concepts', name: 'Version Control', icon: 'git' }
    ],
    projects: [
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
        }
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
        }
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
          featuredFeatures: ['Responsive, mobile-first layout', 'Interactive browsing experience', 'Clean and user-friendly interface'],
          techStack: ['HTML5', 'CSS3', 'JavaScript'],
          role:
            'Front-end design and development — building the responsive layout, interactions and overall UI using vanilla web technologies.',
          impact:
            'A lightweight, dependency-free browsing experience that stays smooth and readable across desktop and mobile.'
        }
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
        }
      }
    ],
    experience: [
      {
        title: 'Python Full Stack Developer Virtual Internship',
        organization: 'EduSkills',
        type: 'Virtual Internship',
        description: 'Hands-on virtual internship covering Python-based full-stack development workflows.',
        tags: ['Python', 'Full Stack']
      },
      {
        title: 'AI/ML Virtual Internship',
        organization: 'EduSkills',
        type: 'Virtual Internship',
        description: 'Virtual internship focused on AI and machine learning fundamentals and applied practice.',
        tags: ['AI', 'Machine Learning']
      },
      {
        title: 'Generative AI',
        organization: 'EduSkills',
        type: 'Internship',
        description: 'Internship program focused on Generative AI concepts and modern AI tooling.',
        tags: ['Generative AI', 'AI']
      },
      {
        title: 'Zscaler Virtual Internship',
        organization: 'EduSkills',
        type: 'Virtual Internship',
        description: 'Virtual internship with Zscaler through EduSkills covering cloud security concepts.',
        tags: ['Cloud Security']
      },
      {
        title: 'Web Exploit Hunting & Bug Bounty',
        organization: 'EduSkills',
        type: 'Virtual Internship',
        description: 'Virtual internship introducing web security, exploit hunting and bug bounty fundamentals.',
        tags: ['Web Security', 'Bug Bounty']
      }
    ],
    education: [
      {
        degree: 'Bachelor of Technology (B.Tech)',
        field: 'Artificial Intelligence & Data Science',
        institution: 'P. R. Pote Patil College of Engineering & Management, Amravati',
        period: 'Expected Graduation 2028',
        detail: 'CGPA: 8.7 / 10'
      },
      {
        degree: 'Higher Secondary Certificate (HSC)',
        field: 'Maharashtra State Board',
        institution: 'Maharashtra State Board',
        period: '',
        detail: '72%'
      },
      {
        degree: 'Secondary School Certificate (SSC)',
        field: 'Maharashtra State Board',
        institution: 'Maharashtra State Board',
        period: '',
        detail: '80%'
      }
    ],
    certificates: [
      {
        title: 'Getting Started with Cybersecurity',
        provider: 'IBM SkillsBuild',
        category: 'Cybersecurity',
        icon: 'cyber',
        issuedAt: 'Aug 17, 2026',
        credentialUrl: 'https://www.credly.com/badges/d2e26920-0fa8-482d-9acc-14ffec862f0d',
        file: '/certificates/getting-started-cybersecurity-ibm.pdf'
      },
      {
        title: 'SQL and Database Management Systems Virtual Internship',
        provider: 'EduSkills / AICTE',
        category: 'Database',
        icon: 'sql',
        issuedAt: 'Aug 17, 2026',
        certificateId: '2026-0FE3CE90E3',
        file: '/certificates/sql-dbms-eduskills.pdf'
      },
      {
        title: 'Ethical Hacking Virtual Internship (Hindi)',
        provider: 'EduSkills / AICTE',
        category: 'Cybersecurity',
        icon: 'ethical',
        issuedAt: 'Mar 18, 2026',
        certificateId: '2026-EFC6148D9C',
        file: '/certificates/ethical-hacking-eduskills.pdf'
      },
      { title: 'Python Full Stack Developer Virtual Internship', provider: 'EduSkills', category: 'Full Stack Development', icon: 'python', file: '/certificates/Python full stack certificate by Eduskills.pdf' },
      { title: 'AI-ML Virtual Internship', provider: 'EduSkills / Google for Developers', category: 'AI / ML', icon: 'ml', file: '/certificates/ai-ml-eduskills.pdf' },
      { title: 'Generative AI Virtual Internship', provider: 'EduSkills / Google Cloud', category: 'Generative AI', icon: 'genai', file: '/certificates/generative-ai-eduskills.pdf' },
      { title: 'Networking Virtual Internship', provider: 'EduSkills / Zscaler', category: 'Cloud / Networking', icon: 'zscaler', file: '/certificates/networking-zscaler.pdf' },
      { title: 'Web Exploit Hunting and Bug Bounty Virtual Internship', provider: 'EduSkills', category: 'Cybersecurity', icon: 'bugbounty', file: '/certificates/web-exploit-bug-bounty-eduskills.pdf' },
      { title: 'Soft Skills', provider: 'NPTEL', category: 'Professional Skills', icon: 'soft', file: '/certificates/Soft Skill Development certificate by NPTEL.pdf' },
      { title: 'Python 3.4.3 Training', provider: 'Spoken Tutorial, IIT Bombay', category: 'Programming', icon: 'python', file: '/certificates/VINIT-NIWALKAR-Participant-Certificate.pdf' },
      { title: 'AI for Beginners', provider: 'HP LIFE', category: 'AI / ML', icon: 'ai', file: '/certificates/ai-for-beginners-hp-life.pdf' },
      { title: 'Getting Started with Artificial Intelligence', provider: 'IBM SkillsBuild', category: 'AI / ML', icon: 'ai', file: '/certificates/getting-started-ai-ibm.pdf' },
      { title: 'Java Training', provider: 'Spoken Tutorial / EduPyramids / IIT Bombay', category: 'Programming', icon: 'java', file: '/certificates/java-training-iit-bombay.pdf' }
    ]
  };

  /* ---------- skill icon tiles (monogram + brand color) ---------- */
  const TILES = {
    react: { abbr: 'Re', c: '#61DAFB' },
    html: { abbr: 'H5', c: '#E34F26' },
    css: { abbr: 'C3', c: '#1572B6' },
    responsive: { abbr: 'Rs', c: '#7C3AED' },
    design: { abbr: 'Ux', c: '#EC4899' },
    node: { abbr: 'N', c: '#339933' },
    express: { abbr: 'Ex', c: '#B0B0C0' },
    api: { abbr: 'R3', c: '#EB5757' },
    mongodb: { abbr: 'M', c: '#47A248' },
    sql: { abbr: 'SQL', c: '#41A6D9' },
    c: { abbr: 'C', c: '#A8B9CC' },
    cpp: { abbr: 'C+', c: '#00599C' },
    java: { abbr: 'J', c: '#F89820' },
    python: { abbr: 'Py', c: '#3776AB' },
    javascript: { abbr: 'JS', c: '#F7DF1E' },
    mern: { abbr: 'M4', c: '#22D3EE' },
    ml: { abbr: 'ML', c: '#8B5CF6' },
    genai: { abbr: 'AI', c: '#7C3AED' },
    vision: { abbr: 'CV', c: '#38BDF8' },
    data: { abbr: 'DS', c: '#22C55E' },
    dsa: { abbr: 'DSA', c: '#F59E0B' },
    git: { abbr: 'G', c: '#F05033' },
    oop: { abbr: 'OOP', c: '#E11D48' }
  };

  /* ---------- render: skills ---------- */
  function renderSkills(skills, useFallback) {
    const grid = $('#skillsGrid');
    if (!grid) return;
    const groups = skills.reduce((acc, s) => {
      (acc[s.category] = acc[s.category] || []).push(s);
      return acc;
    }, {});

    const catOrder = ['Frontend', 'Backend', 'Database', 'Programming', 'Full Stack', 'AI / Data', 'Tools & Concepts'];

    const html = catOrder
      .filter((c) => groups[c])
      .map((cat, catIdx) => {
        const cardDelay = Math.min(catIdx * 90, 540);
        const tilesHtml = groups[cat]
          .map(function (s, tileIdx) {
            const tile = TILES[s.icon] || { abbr: s.name.slice(0, 2).toUpperCase(), c: '#8B8FA8' };
            const color = tile.c;
            return (
              '<button type="button" class="skill-tile" ' +
              'data-reveal style="--d:' + Math.min(tileIdx * 55, 440) + 'ms" title="' + esc(s.name) + '" aria-label="' + esc(s.name) + '">' +
              '<span class="skill-tile-icon" style="color:' + color + '">' + esc(tile.abbr) + '</span>' +
              '<span class="skill-tile-name">' + esc(s.name) + '</span>' +
              '</button>'
            );
          })
          .join('');
        return (
          '<div class="skill-card" data-cat="' + esc(cat) + '" data-reveal style="--d:' + cardDelay + 'ms">' +
          '<h3 class="skill-card-title">' + esc(cat) + '</h3>' +
          '<div class="skill-tiles">' + tilesHtml + '</div>' +
          '</div>'
        );
      })
      .join('');

    grid.innerHTML = html;
    if (useFallback) grid.setAttribute('data-source', 'fallback');

    /* category filter (additive enhancement; hidden when a single category exists) */
    const filter = $('#skillsFilter');
    if (filter) {
      const cats = catOrder.filter((c) => groups[c]);
      if (cats.length > 1) {
        filter.hidden = false;
        filter.innerHTML =
          '<button type="button" class="sf-btn is-active" data-cat="all" aria-pressed="true">All</button>' +
          cats
            .map(function (c) {
              return '<button type="button" class="sf-btn" data-cat="' + esc(c) + '" aria-pressed="false">' + esc(c) + '</button>';
            })
            .join('');
        filter.querySelectorAll('.sf-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            const sel = btn.getAttribute('data-cat');
            filter.querySelectorAll('.sf-btn').forEach(function (b) {
              const on = b === btn;
              b.classList.toggle('is-active', on);
              b.setAttribute('aria-pressed', String(on));
            });
            $$('.skill-card', grid).forEach(function (card) {
              card.classList.toggle('is-filtered', sel !== 'all' && card.getAttribute('data-cat') !== sel);
              if (!card.classList.contains('is-filtered') && !card.classList.contains('is-revealed')) {
                card.classList.add('is-revealed');
              }
            });
          });
        });
      }
    }
  }

  /* ---------- render: projects ---------- */
  function renderProjects(projects) {
    const list = $('#projectsList');
    if (!list) return;

    const makeTags = (tags) =>
      tags.map((t) => '<span class="project-tag">' + esc(t) + '</span>').join('');

    const sorted = projects.slice().sort((a, b) => (a.order || 0) - (b.order || 0));

    const GH_ICON = '<svg class="btn-gh-icon" viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>';

    const cards = sorted.map(function (p, i) {
      var d = 100 + i * 120;
      var isAi = (p.tags || []).some(function (t) { return ['RAG', 'Ollama', 'Llama 3.2'].indexOf(t) !== -1; });
      var cls = 'project-card';
      if (isAi) cls += ' project-card--ai';

      var tagHtml = makeTags(p.tags || []);
      var caseId = esc(p._id || p.name);
      var indexLabel = String(i + 1).padStart(2, '0');

      var ghHtml = '';
      if (p.github) {
        ghHtml = '<a class="btn btn-outline btn-gh" href="' + esc(p.github) + '" target="_blank" rel="noopener noreferrer" ' +
          'aria-label="View ' + esc(p.name) + ' on GitHub" onclick="event.stopPropagation()">' +
          GH_ICON + 'GitHub <span class="btn-gh-arrow" aria-hidden="true">&#8599;</span></a>';
      }

      return '<article class="' + cls + '" data-reveal style="--d:' + d + 'ms" tabindex="0" role="button" aria-label="Open case study for ' + esc(p.name) + '">' +
        '<span class="project-index" aria-hidden="true">' + indexLabel + '</span>' +
        (p.badge ? '<span class="project-badge">' + esc(p.badge) + '</span>' : '') +
        '<h3 class="project-name">' + esc(p.name) + '</h3>' +
        (p.subtitle ? '<p class="project-subtitle">' + esc(p.subtitle) + '</p>' : '') +
        (p.description ? '<p class="project-desc">' + esc(p.description) + '</p>' : '') +
        '<div class="project-tags">' + tagHtml + '</div>' +
        '<div class="project-actions">' +
          '<button type="button" class="btn btn-outline" data-open-case="' + caseId + '" aria-label="View case study for ' + esc(p.name) + '">Case Study</button>' +
          ghHtml +
        '</div>' +
      '</article>';
    }).join('');

    list.innerHTML = '<div class="projects-grid">' + cards + '</div>';
  }

  /* ---------- render: experience timeline ---------- */
  function renderExperience(items) {
    const tl = $('#experienceTimeline');
    if (!tl) return;
    tl.innerHTML = items
      .map(
        (item, i) =>
          '<div class="timeline-item" data-reveal style="--d:' + Math.min(i * 110, 660) + 'ms">' +
          '<span class="timeline-tag">' + esc(item.type || 'Internship') + '</span>' +
          '<h3 class="timeline-title">' + esc(item.title) + '</h3>' +
          '<p class="timeline-org">' + esc(item.organization || '') + (item.period ? ' &middot; ' + esc(item.period) : '') + '</p>' +
          (item.description ? '<p class="timeline-desc">' + esc(item.description) + '</p>' : '') +
          (item.tags && item.tags.length
            ? '<ul class="timeline-tags">' + item.tags.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>'
            : '') +
          '</div>'
      )
      .join('');
  }

  /* ---------- render: education ---------- */
  function renderEducation(items) {
    const grid = $('#educationGrid');
    if (!grid) return;
    const icon = function () {
      return (
        '<span class="edu-icon" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/>' +
        '</svg></span>'
      );
    };
    grid.innerHTML = items
      .map(
        (e, i) =>
          '<div class="edu-card" data-reveal style="--d:' + Math.min(i * 110, 330) + 'ms">' +
          icon() +
          '<h3 class="edu-degree">' + esc(e.degree) + '</h3>' +
          '<p class="edu-field">' + esc(e.field || '') + '</p>' +
          '<p class="timeline-org">' + esc(e.institution || '') + '</p>' +
          '<div class="edu-detail">' +
          (e.period ? '<span class="edu-chip">' + esc(e.period) + '</span>' : '') +
          (e.detail ? '<span class="edu-chip edu-chip--accent">' + esc(e.detail) + '</span>' : '') +
          '</div>' +
          '</div>'
      )
      .join('');
  }

  /* ---------- certificates: data state ---------- */
  const certState = { items: [], query: '', category: 'All' };
  const CERT_ARROW_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  function certIndexLabel(c, all) {
    const idx = all.indexOf(c) + 1;
    return String(idx > 99 ? 99 : idx).padStart(2, '0');
  }

  function renderCertificates(items) {
    const grid = $('#certGrid');
    if (!grid) return;
    certState.items = items || [];
    const q = certState.query.trim().toLowerCase();
    const cat = certState.category;

    const visible = certState.items.filter(function (c) {
      if (cat !== 'All' && (c.category || '') !== cat) return false;
      if (!q) return true;
      const hay = ((c.title || '') + ' ' + (c.provider || '') + ' ' + (c.category || '')).toLowerCase();
      return hay.indexOf(q) !== -1;
    });

    const empty = visible.length === 0;
    const html = visible
      .map(function (c, i) {
        const index = certIndexLabel(c, certState.items);
        const inner =
          '<span class="cert-index" aria-hidden="true">' + index + '</span>' +
          '<div class="cert-card-body">' +
          '<h3 class="cert-title">' + esc(c.title) + '</h3>' +
          '<p class="cert-provider">' + esc(c.provider || '') + '</p>' +
          '</div>' +
          (c.file
            ? '<span class="cert-arrow" aria-hidden="true">' + CERT_ARROW_ICON + '</span>'
            : '');

        if (c.file) {
          return (
            '<a class="cert-card is-clickable" data-reveal style="--d:' + Math.min(i * 80, 400) + 'ms" ' +
            'href="' + esc(c.file) + '" target="_blank" rel="noopener noreferrer" ' +
            'aria-label="Open ' + esc(c.title) + ' certificate from ' + esc(c.provider || '') + '">' +
            inner +
            '</a>'
          );
        }
        return (
          '<div class="cert-card" data-reveal style="--d:' + Math.min(i * 80, 400) + 'ms">' +
          inner +
          '</div>'
        );
      })
      .join('');

    grid.innerHTML = html || '<p class="cert-empty">No certificates match your search.</p>';

    const verifier = $('#certVerify');
    if (verifier) verifier.hidden = !empty;

    const resetBtn = $('#certReset');
    if (resetBtn) resetBtn.hidden = !(certState.query || certState.category !== 'All');

    refreshReveal();
  }

  /* ---------- certificates: search + filter toolbar ---------- */
  const CERT_FILTER_ORDER = ['All', 'AI / ML', 'Generative AI', 'Full Stack Development', 'Cybersecurity', 'Database', 'Cloud / Networking', 'Professional Skills', 'Programming'];

  function buildCertFilters() {
    const filters = $('#certFilters');
    if (!filters) return;
    const present = {};
    certState.items.forEach(function (c) { present[c.category || 'Other'] = true; });
    const cats = CERT_FILTER_ORDER.filter(function (c) { return c === 'All' || present[c]; });
    filters.innerHTML = cats
      .map(function (c) {
        return '<button type="button" class="cert-f-btn' + (c === certState.category ? ' is-active' : '') + '" data-cat="' + esc(c) + '" aria-pressed="' + (c === certState.category) + '">' + esc(c) + '</button>';
      })
      .join('');
  }

  function initCertControls() {
    buildCertFilters();
    if (certControlsBound) return;
    certControlsBound = true;
    const search = $('#certSearch');
    if (search) {
      search.addEventListener('input', function () {
        certState.query = search.value;
        renderCertificates(certState.items);
      });
    }
    const filters = $('#certFilters');
    if (filters) {
      filters.addEventListener('click', function (e) {
        const btn = e.target.closest('.cert-f-btn');
        if (!btn) return;
        const cat = btn.getAttribute('data-cat');
        certState.category = cat;
        filters.querySelectorAll('.cert-f-btn').forEach(function (b) {
          const on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', String(on));
        });
        renderCertificates(certState.items);
      });
    }
    const reset = $('#certReset');
    if (reset) {
      reset.addEventListener('click', function () {
        if (search) search.value = '';
        certState.query = '';
        certState.category = 'All';
        if (filters) {
          filters.querySelectorAll('.cert-f-btn').forEach(function (b) {
            const on = b.getAttribute('data-cat') === 'All';
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', String(on));
          });
        }
        renderCertificates(certState.items);
      });
    }
  }

  /* ---------- certificates: render entry ---------- */
  let certControlsBound = false;

  function renderCertificatesSection(items) {
    renderCertificates(items && items.length ? items : FALLBACK.certificates);
    initCertControls();
  }

  /* ---------- modal ---------- */
  const modal = $('#projectModal');
  const modalContent = $('#modalContent');
  const modalCloseBtn = $('#modalClose');
  let lastModalTrigger = null;

  function openModal(project, projects) {
    if (!modal || !project) return;
    lastModalTrigger = document.activeElement;

    const displayName = esc(project.name);
    const tags =
      (project.caseStudy && project.caseStudy.techStack && project.caseStudy.techStack.length
        ? project.caseStudy.techStack
        : project.tags || []);
    const techChips = tags.map((t) => '<span class="project-tag">' + esc(t) + '</span>').join('');
    let ghBtn = '';
    if (project.github) {
      ghBtn =
        '<a class="btn btn-outline" href="' + esc(project.github) + '" target="_blank" rel="noopener noreferrer">View on GitHub</a>';
    }

    const cs = project.caseStudy || {};
    const features =
      cs.featuredFeatures && cs.featuredFeatures.length
        ? '<div class="modal-section"><h4 class="modal-section-title">Key Features</h4><ul class="modal-features">' +
          cs.featuredFeatures.map((f) => '<li>' + esc(f) + '</li>').join('') +
          '</ul></div>'
        : '';
    const tech =
      techChips
        ? '<div class="modal-section"><h4 class="modal-section-title">Tech Stack</h4><div class="modal-tech">' + techChips + '</div></div>'
        : '';

    modalContent.innerHTML =
      '<div class="modal-header">' +
      (project.badge ? '<span class="project-badge">' + esc(project.badge) + '</span>' : '') +
      '<h3 class="modal-title" id="modalTitle">' + displayName + '</h3>' +
      (project.subtitle ? '<p class="modal-subtitle">' + esc(project.subtitle) + '</p>' : '') +
      '</div>' +
      (cs.overview ? '<div class="modal-section"><h4 class="modal-section-title">Overview</h4><p class="modal-text">' + esc(cs.overview) + '</p></div>' : '') +
      (cs.problem ? '<div class="modal-section"><h4 class="modal-section-title">Problem</h4><p class="modal-text">' + esc(cs.problem) + '</p></div>' : '') +
      (cs.solution ? '<div class="modal-section"><h4 class="modal-section-title">Solution</h4><p class="modal-text">' + esc(cs.solution) + '</p></div>' : '') +
      (cs.architecture ? '<div class="modal-section"><h4 class="modal-section-title">Architecture</h4><p class="modal-text">' + esc(cs.architecture) + '</p></div>' : '') +
      features +
      tech +
      (cs.role ? '<div class="modal-section"><h4 class="modal-section-title">My Role &amp; Contribution</h4><p class="modal-text">' + esc(cs.role) + '</p></div>' : '') +
      (cs.impact ? '<div class="modal-section"><h4 class="modal-section-title">Result &amp; Impact</h4><p class="modal-text">' + esc(cs.impact) + '</p></div>' : '') +
      '<div class="modal-actions">' +
      '<a class="btn btn-outline" href="https://github.com/vinitniwalkar804-design" target="_blank" rel="noopener noreferrer">View GitHub Profile</a>' +
      ghBtn +
      '</div>';

    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }
  }

  function closeModal() {
    if (!modal) return;
    if (typeof modal.close === 'function') modal.close();
    else modal.removeAttribute('open');
    if (lastModalTrigger && lastModalTrigger.focus) lastModalTrigger.focus();
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    modal.addEventListener('close', () => {
      if (lastModalTrigger && lastModalTrigger.focus) lastModalTrigger.focus();
    });
  }

  /* ---------- reveal observer ---------- */
  let revealObserver = null;
  function initReveal() {
    if (!('IntersectionObserver' in window)) {
      $$('[data-reveal]').forEach((el) => el.classList.add('is-revealed'));
      return;
    }
    if (revealObserver) revealObserver.disconnect();
    const els = $$('[data-reveal]');
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach((el) => revealObserver.observe(el));
  }

  /* refresh reveal state for re-rendered elements (certificates search/filter) */
  function refreshReveal() {
    $$('[data-reveal]:not(.is-revealed)').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) el.classList.add('is-revealed');
      else if (revealObserver) revealObserver.observe(el);
    });
  }

  /* ---------- premium motion (2026) ---------- */
  const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* error tracker (for diagnostics) */
  window.__pageErrs = window.__pageErrs || [];
  window.addEventListener('error', (e) => {
    window.__pageErrs.push('window error: ' + (e.message || 'unknown'));
  });
  window.addEventListener('unhandledrejection', (e) => {
    window.__pageErrs.push('unhandled rejection: ' + String((e.reason && e.reason.message) || e.reason || 'unknown'));
  });

  /* count-up numbers (about stats) */
  let countObserver = null;
  function runCountUp(el) {
    const target = parseFloat(el.getAttribute('data-count')) || 0;
    const digits = parseInt(el.getAttribute('data-digits') || '0', 10);
    if (reduceMotion()) {
      el.textContent = digits ? target.toFixed(digits) : String(Math.round(target));
      return;
    }
    const dur = 1300;
    const start = performance.now();
    function tick(now) {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = digits ? (target * eased).toFixed(digits) : String(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  function initCountUp() {
    if (!('IntersectionObserver' in window)) {
      $$('[data-count]').forEach(runCountUp);
      return;
    }
    if (countObserver) countObserver.disconnect();
    countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            runCountUp(entry.target);
            countObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    $$('[data-count]').forEach((el) => countObserver.observe(el));
  }

  /* custom cursor follower (desktop / fine pointer only) */
  function initCursor() {
    if (!finePointer() || reduceMotion()) return;
    const dot = $('#cursorDot');
    const ring = $('#cursorRing');
    if (!dot || !ring) return;
    document.documentElement.classList.add('has-cursor');
    let mx = -200, my = -200, rx = -200, ry = -200, raf = null;
    let lastHover = false;

    function move(e) {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = 'translate3d(' + (mx - 4) + 'px,' + (my - 4) + 'px,0)';
      if (!raf) {
        raf = requestAnimationFrame(function ringFrame() {
          rx += (mx - rx) * 0.16;
          ry += (my - ry) * 0.16;
          ring.style.transform = 'translate3d(' + (rx - 24) + 'px,' + (ry - 24) + 'px,0)';
          raf = null;
        });
      }
    }
    window.addEventListener('mousemove', move, { passive: true });
    document.addEventListener('mouseleave', () => {
      dot.style.opacity = 0;
      ring.style.opacity = 0;
    });
    document.documentElement.addEventListener('mouseenter', () => {
      dot.style.opacity = 1;
      ring.style.opacity = 1;
    });
    document.addEventListener(
      'mouseover',
      (e) => {
        const t = e.target.closest('a, button, .project-card, .skill-tile, input, textarea, select, [role="button"]');
        const on = Boolean(t);
        dot.classList.toggle('is-hover', on);
        ring.classList.toggle('is-hover', on);
        if (on !== lastHover) lastHover = on;
      },
      { passive: true }
    );
  }

  /* hero ambient mouse-follow glow (desktop only) */
  function initHeroGlow() {
    if (!finePointer() || reduceMotion()) return;
    const glow = $('#heroGlow');
    if (!glow) return;
    let tx = innerWidth / 2, ty = 240, cx = tx, cy = ty;
    window.addEventListener('mousemove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
    }, { passive: true });
    (function glowLoop() {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      glow.style.transform = 'translate3d(' + (cx - 320) + 'px,' + (cy - 320) + 'px,0)';
      requestAnimationFrame(glowLoop);
    })();
  }

  /* background parallax (scroll) */
  function initBgParallax() {
    if (reduceMotion()) return;
    const grid = $('.bg-grid');
    if (!grid) return;
    let ticking = false;
    function update() {
      grid.style.transform = 'translate3d(0,' + (window.scrollY * 0.12).toFixed(1) + 'px,0)';
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  /* header scroll progress bar */
  function initScrollProgress() {
    const bar = $('#scrollProgress');
    if (!bar) return;
    let ticking = false;
    function update() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.max(0, Math.min(1, window.scrollY / max)) : 0;
      bar.style.width = (p * 100).toFixed(2) + '%';
      bar.style.opacity = p > 0.02 ? '1' : '0';
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* timeline progressive fill */
  function initTimeline() {
    const tl = $('#experienceTimeline');
    if (!tl) return;
    let ticking = false;
    function update() {
      const rect = tl.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom < 0 || rect.top > vh) {
        ticking = false;
        return;
      }
      const total = rect.height - vh;
      const p = total > 0 ? -rect.top / total : 1;
      tl.style.setProperty('--tl-progress', String(Math.max(0, Math.min(1, p))));
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* project card subtle 3D tilt (fine pointer only) */
  function initProjectTilt() {
    if (!finePointer() || reduceMotion()) return;
    $$('.project-card').forEach((card) => {
      let cancels = null;
      card.addEventListener('pointermove', (e) => {
        if (cancels) cancelAnimationFrame(cancels);
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        cancels = requestAnimationFrame(() => {
          card.style.setProperty('--rx', (py * -5).toFixed(2) + 'deg');
          card.style.setProperty('--ry', (px * 6).toFixed(2) + 'deg');
          card.style.setProperty('--gx', ((px + 0.5) * 100).toFixed(1) + '%');
          card.style.setProperty('--gy', ((py + 0.5) * 100).toFixed(1) + '%');
          cancels = null;
        });
      }, { passive: true });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--gx', '50%');
        card.style.setProperty('--gy', '0%');
      });
    });
  }

  /* about stats fill (derived from loaded content — no invented facts) */
  function populateStats(data) {
    const stats = $('#aboutStats');
    if (!stats) return;
    const projects = (data.projects || []).length;
    const internships = (data.experience || []).length;
    const certificates = (data.certificates || []).length;
    const stack = new Set((data.skills || []).map((s) => s.category)).size;
    const map = { projects: projects, internships: internships, certificates: certificates, stack: stack };
    $$('.stat', stats).forEach(function (el) {
      const numEl = $('.stat-num', el);
      const labelEl = $('.stat-label', el);
      if (!numEl || !labelEl) return;
      const key = labelEl.getAttribute('data-stat');
      const value = map[key];
      if (typeof value === 'number' && value > 0) {
        numEl.setAttribute('data-count', String(value));
        numEl.setAttribute('data-digits', '0');
        numEl.textContent = '0';
      }
    });
  }

  /* nav active indicator (desktop) */
  function moveNavIndicator() {
    const ind = $('#navIndicator');
    const list = $$('.nav-list').pop();
    if (!ind || !list) return;
    if (window.innerWidth <= 991.98) {
      ind.style.opacity = 0;
      return;
    }
    const active = $('.nav-link.is-active', list);
    if (!active) {
      ind.style.opacity = 0;
      return;
    }
    ind.style.width = active.offsetWidth + 'px';
    ind.style.transform = 'translateX(' + active.offsetLeft + 'px)';
    ind.style.opacity = 1;
  }

  /* ---------- navigation ---------- */
  const header = $('#siteHeader');
  const menuToggle = $('#menuToggle');
  const nav = $('#primaryNav');
  const navLinks = $$('.nav-link');

  function onScrollHeader() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 12);
  }
  window.addEventListener('scroll', onScrollHeader, { passive: true });

  function closeMenu() {
    if (!nav || !menuToggle) return;
    nav.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = '';
  }

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }

  navLinks.forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modal && modal.open) closeModal();
      if (nav && nav.classList.contains('is-open')) {
        closeMenu();
        if (menuToggle) menuToggle.focus();
      }
    }
  });

  /* active section highlighting */
  const sections = $$('main section[id]');
  if ('IntersectionObserver' in window && sections.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navLinks.forEach((l) => {
              const on = l.getAttribute('href') === '#' + entry.target.id;
              l.classList.toggle('is-active', on);
              if (on) l.setAttribute('aria-current', 'true');
              else l.removeAttribute('aria-current');
            });
            moveNavIndicator();
          }
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- theme ---------- */
  const themeToggle = $('#themeToggle');
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('vn-theme', theme);
    } catch (_) {}
  }
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
    });
  }

  /* ---------- GitHub live stat (graceful) ---------- */
  async function loadGitHubStat() {
    const el = $('#githubStat');
    if (!el) return;
    try {
      const res = await fetchJSON('https://api.github.com/users/vinitniwalkar804-design', { timeoutMs: 4000 });
      if (res.ok && res.data && typeof res.data.public_repos === 'number') {
        el.textContent = res.data.public_repos + ' public repos' + (res.data.followers ? ' \u00b7 ' + res.data.followers + ' followers' : '');
        el.hidden = false;
      }
    } catch (_) {
      /* graceful: stat simply stays hidden */
    }
  }

  /* ---------- download resume guard ---------- */
  const resumeLink = $('#downloadResume');
  if (resumeLink) {
    resumeLink.addEventListener('click', (e) => {
      fetch(resumeLink.getAttribute('href'), { method: 'HEAD' })
        .then((r) => {
          if (!r.ok) {
            e.preventDefault();
            toast('Resume PDF not uploaded yet. It will appear here soon.', 'error');
          }
        })
        .catch(() => {
          e.preventDefault();
          toast('Resume PDF not available right now.', 'error');
        });
    });
  }

  /* ---------- contact form ---------- */
  const form = $('#contactForm');
  const statusEl = $('#formStatus');
  const submitBtn = $('#contactSubmit');

  function setFieldError(input, message) {
    const id = input.id;
    const errEl = $('#' + id.replace('contact', '') + 'Error') || $('#' + (input.name) + 'Error');
    const realErr = id === 'contactName' ? $('#nameError') : id === 'contactEmail' ? $('#emailError') : $('#messageError');
    if (realErr) {
      realErr.textContent = message || '';
      realErr.hidden = !message;
    }
    input.classList.toggle('is-invalid', Boolean(message));
  }

  function validateField(input) {
    const v = input.value.trim();
    let msg = '';
    if (input.id === 'contactName') {
      if (!v) msg = 'Please enter your name.';
      else if (v.length < 2) msg = 'Name must be at least 2 characters.';
    } else if (input.id === 'contactEmail') {
      if (!v) msg = 'Please enter your email.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = 'Please enter a valid email address.';
    } else if (input.id === 'contactMessage') {
      if (!v) msg = 'Please enter a message.';
      else if (v.length < 10) msg = 'Message must be at least 10 characters.';
    }
    setFieldError(input, msg);
    return !msg;
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      statusEl.hidden = false;

      const fields = [form.elements.name, form.elements.email, form.elements.message];
      const name = form.elements.name;
      const email = form.elements.email;
      const message = form.elements.message;
      let valid = true;
      fields.forEach((f) => {
        if (!validateField(f)) valid = false;
      });
      if (!valid) return;

      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');
      submitBtn.setAttribute('aria-busy', 'true');

      try {
        const res = await fetchJSON('/api/contact', { method: 'POST', body: { name: name.value.trim(), email: email.value.trim(), message: message.value.trim() }, timeoutMs: 20000 });
        if (!res.ok) {
          if (res.status === 503) {
            statusEl.className = 'form-status is-error';
            statusEl.textContent = 'The database is not reachable right now. Your message was not saved — please try again later.';
          } else {
            statusEl.className = 'form-status is-error';
            statusEl.textContent = (res.data && res.data.message) || 'Something went wrong. Please try again.';
            if (res.data && res.data.errors) {
              const parts = res.data.errors;
              if (parts[0]) setFieldError(form.elements.name, '');
            }
          }
          return;
        }
        form.reset();
        statusEl.className = 'form-status is-success';
        statusEl.textContent = (res.data && res.data.message) || 'Message received. Thank you for reaching out!';
      } catch (_) {
        statusEl.className = 'form-status is-error';
        statusEl.textContent = 'Network error — could not reach the server. Are you running the backend?';
      } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
        submitBtn.removeAttribute('aria-busy');
      }
    });

    form.addEventListener('input', (e) => {
      if (e.target.classList.contains('field-input') && e.target.classList.contains('is-invalid')) {
        validateField(e.target);
      }
    });
    form.addEventListener('blur', (e) => {
      if (e.target.classList.contains('field-input')) validateField(e.target);
    }, true);
  }

  /* ---------- data loading + master render ---------- */
  /* eslint-disable-next-line no-unused-vars */
  function renderAll(data, useFallback) {
    const p = data.profile || FALLBACK.profile;
    const nameEl = $('.hero-name');
    if (nameEl) nameEl.textContent = p.name;
    const roleEl = $('.hero-role');
    if (roleEl && p.title) {
      roleEl.innerHTML = esc(p.title) + ' <span class="hero-role-accent">' + esc(p.titleAccent || '') + '</span>';
    }
    const taglineEl = $('.hero-tagline');
    if (taglineEl && p.role) taglineEl.textContent = '"' + p.role + '"';
    const avail = $('.availability');
    if (avail && p.availability) avail.innerHTML = '<span class="availability-dot" aria-hidden="true"></span>' + esc(p.availability);
    const sum = $('#aboutSummary');
    if (sum && p.tagline) sum.textContent = p.tagline;

    renderSkills(data.skills || [], useFallback || false);
    renderProjects(data.projects || []);
    renderExperience(data.experience || []);
    renderEducation(data.education || []);
    renderCertificatesSection(data.certificates || []);
  }

  const DATA_SOURCES = [
    '/api/profile',
    '/api/skills',
    '/api/projects',
    '/api/experience',
    '/api/education',
    '/api/certificates'
  ];

  async function init() {
    // year
    const yearEl = $('#year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    // render a loading skeleton immediately from fallback so the page is never empty
    renderAll(FALLBACK, false);

    const results = await Promise.allSettled(DATA_SOURCES.map((u) => fetchJSON(u)));
    const pick = (i) => {
      const r = results[i];
      return r.status === 'fulfilled' && r.value.ok && r.value.data && r.value.data.success ? r.value.data.data : null;
    };

    const data = {
      profile: pick(0) || FALLBACK.profile,
      skills: pick(1) || FALLBACK.skills,
      projects: pick(2) || FALLBACK.projects,
      experience: pick(3) || FALLBACK.experience,
      education: pick(4) || FALLBACK.education,
      certificates: pick(5) || FALLBACK.certificates
    };

    const usingFallback = !pick(0);
    renderAll(data, usingFallback);

    populateStats(data);
    initReveal();
    initCountUp();
    initScrollProgress();
    initTimeline();
    initProjectTilt();
    initCursor();
    initHeroGlow();
    initBgParallax();
    moveNavIndicator();
    onScrollHeader();
    loadGitHubStat();

    window.addEventListener('resize', moveNavIndicator, { passive: true });
  }

  /* delegated click handling for project cards */
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open-case]');
    if (opener) {
      e.stopPropagation();
      const key = opener.getAttribute('data-open-case');
      const projects = window.__PROJECTS__ || [];
      const proj = projects.find((p) => String(p._id || p.name) === key);
      if (proj) openModal(proj, projects);
      return;
    }

    const card = e.target.closest('.project-card');
    if (card && !e.target.closest('a, button')) {
      const key = card.querySelector('.project-name, .project-card-name');
      const name = key ? key.textContent.trim() : '';
      const projects = window.__PROJECTS__ || [];
      const proj = projects.find((p) => p.name === name) || projects.find((p) => p.name.startsWith(name));
      if (proj) openModal(proj, projects);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('project-card')) {
      const name =
        (e.target.querySelector('.project-name, .project-card-name')
          ? e.target.querySelector('.project-name, .project-card-name').textContent.trim()
          : '');
      const projects = window.__PROJECTS__ || [];
      const proj = projects.find((p) => p.name === name);
      if (proj) openModal(proj, projects);
    }
  });

  /* expose projects for the delegated handlers after load */
  const originalRenderProjects = renderProjects;
  renderProjects = function (projects, useFallback) {
    window.__PROJECTS__ = projects || [];
    originalRenderProjects.apply(this, arguments);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();