// import { useEffect, useMemo, useState } from 'react'
// import './TeacherDashboard.css'

// type TeacherDashboardProps = {
//   name: string
//   onLogout: () => void
// }

// type Achievement = {
//   id: number
//   title: string
//   category: string
//   description: string
//   date: string
// }

// type StudentAchievement = Achievement & {
//   studentName: string
// }

// type Course = {
//   id: number
//   name: string
//   code: string
// }

// type Assignment = {
//   id: number
//   title: string
//   course: string
//   dueDate: string
// }

// type Material = {
//   id: number
//   title: string
//   course: string
// }

// type Activity = {
//   id: number
//   text: string
//   date: string
// }

// function TeacherDashboard({
//   name,
//   onLogout,
// }: TeacherDashboardProps) {
//   const [activeSection, setActiveSection] = useState('Dashboard')

//   // =====================================================
//   // PROFILE
//   // =====================================================

//   const [profile, setProfile] = useState({
//     name: name,
//     email: '',
//     mobile: '',
//     facultyId: '',
//     department: '',
//     designation: '',
//   })

//   const [profileSaved, setProfileSaved] = useState(false)

//   // =====================================================
//   // PROFESSIONAL INFORMATION
//   // =====================================================

//   const [professionalInfo, setProfessionalInfo] = useState({
//     designation: '',
//     department: '',
//     qualification: '',
//     experience: '',
//     specialization: '',
//     skills: '',
//   })

//   const [professionalSaved, setProfessionalSaved] =
//     useState(false)

//   // =====================================================
//   // FACULTY ACHIEVEMENTS
//   // =====================================================

//   const [achievements, setAchievements] = useState<
//     Achievement[]
//   >([])

//   const [achievementForm, setAchievementForm] = useState({
//     title: '',
//     category: '',
//     description: '',
//     date: '',
//   })

//   const [editingAchievementId, setEditingAchievementId] =
//     useState<number | null>(null)

//   const [achievementMessage, setAchievementMessage] =
//     useState('')

//   // =====================================================
//   // STUDENT ACHIEVEMENTS
//   // =====================================================

//   const [studentAchievements, setStudentAchievements] =
//     useState<StudentAchievement[]>([])

//   const [studentAchievementForm, setStudentAchievementForm] =
//     useState({
//       studentName: '',
//       title: '',
//       category: '',
//       description: '',
//       date: '',
//     })

//   const [
//     editingStudentAchievementId,
//     setEditingStudentAchievementId,
//   ] = useState<number | null>(null)

//   const [
//     studentAchievementMessage,
//     setStudentAchievementMessage,
//   ] = useState('')

//   // =====================================================
//   // LMS
//   // =====================================================

//   const [courses, setCourses] = useState<Course[]>([])

//   const [assignments, setAssignments] = useState<Assignment[]>(
//     []
//   )

//   const [materials, setMaterials] = useState<Material[]>([])

//   const [courseForm, setCourseForm] = useState({
//     name: '',
//     code: '',
//   })

//   const [assignmentForm, setAssignmentForm] = useState({
//     title: '',
//     course: '',
//     dueDate: '',
//   })

//   const [materialForm, setMaterialForm] = useState({
//     title: '',
//     course: '',
//   })

//   const [lmsMessage, setLmsMessage] = useState('')

//   // =====================================================
//   // SETTINGS
//   // =====================================================

//   const [notificationPreference, setNotificationPreference] =
//     useState('all')

//   const [settingsSaved, setSettingsSaved] = useState(false)

//   // =====================================================
//   // AI ASSISTANT
//   // =====================================================

//   const [aiResult, setAiResult] = useState('')

//   // =====================================================
//   // ACTIVITY
//   // =====================================================

//   const [activities, setActivities] = useState<Activity[]>([])

//   // =====================================================
//   // SEARCH
//   // =====================================================

//   const [studentSearch, setStudentSearch] = useState('')

//   // =====================================================
//   // LOAD DATA FROM LOCAL STORAGE
//   // =====================================================

//   useEffect(() => {
//     try {
//       const savedProfile =
//         localStorage.getItem('facultyProfile')

//       if (savedProfile) {
//         setProfile(JSON.parse(savedProfile))
//       }

//       const savedProfessional =
//         localStorage.getItem(
//           'facultyProfessionalInfo'
//         )

//       if (savedProfessional) {
//         setProfessionalInfo(
//           JSON.parse(savedProfessional)
//         )
//       }

//       const savedAchievements =
//         localStorage.getItem('facultyAchievements')

//       if (savedAchievements) {
//         setAchievements(
//           JSON.parse(savedAchievements)
//         )
//       }

//       const savedStudentAchievements =
//         localStorage.getItem(
//           'studentAchievements'
//         )

//       if (savedStudentAchievements) {
//         setStudentAchievements(
//           JSON.parse(savedStudentAchievements)
//         )
//       }

//       const savedCourses =
//         localStorage.getItem('lmsCourses')

//       if (savedCourses) {
//         setCourses(JSON.parse(savedCourses))
//       }

//       const savedAssignments =
//         localStorage.getItem('lmsAssignments')

//       if (savedAssignments) {
//         setAssignments(JSON.parse(savedAssignments))
//       }

//       const savedMaterials =
//         localStorage.getItem('lmsMaterials')

//       if (savedMaterials) {
//         setMaterials(JSON.parse(savedMaterials))
//       }

//       const savedActivities =
//         localStorage.getItem('facultyActivities')

//       if (savedActivities) {
//         setActivities(JSON.parse(savedActivities))
//       }

//       const savedSettings =
//         localStorage.getItem('facultySettings')

//       if (savedSettings) {
//         const settings = JSON.parse(savedSettings)

//         setNotificationPreference(
//           settings.notificationPreference || 'all'
//         )
//       }
//     } catch {
//       console.log('Unable to load saved dashboard data')
//     }
//   }, [])

//   // =====================================================
//   // ACTIVITY HELPER
//   // =====================================================

//   const addActivity = (text: string) => {
//     const activity: Activity = {
//       id: Date.now(),
//       text,
//       date: new Date().toLocaleString(),
//     }

//     setActivities((previous) => {
//       const updated = [activity, ...previous].slice(0, 8)

//       localStorage.setItem(
//         'facultyActivities',
//         JSON.stringify(updated)
//       )

//       return updated
//     })
//   }

//   // =====================================================
//   // PROFILE
//   // =====================================================

//   const handleProfileChange = (
//     field: string,
//     value: string
//   ) => {
//     setProfile((previous) => ({
//       ...previous,
//       [field]: value,
//     }))

//     setProfileSaved(false)
//   }

//   const handleProfileSave = () => {
//     localStorage.setItem(
//       'facultyProfile',
//       JSON.stringify(profile)
//     )

//     setProfileSaved(true)

//     addActivity('Faculty profile updated')
//   }

//   // =====================================================
//   // PROFESSIONAL INFORMATION
//   // =====================================================

//   const handleProfessionalChange = (
//     field: string,
//     value: string
//   ) => {
//     setProfessionalInfo((previous) => ({
//       ...previous,
//       [field]: value,
//     }))

//     setProfessionalSaved(false)
//   }

//   const handleProfessionalSave = () => {
//     localStorage.setItem(
//       'facultyProfessionalInfo',
//       JSON.stringify(professionalInfo)
//     )

//     setProfessionalSaved(true)

//     const updatedProfile = {
//       ...profile,
//       department: professionalInfo.department,
//       designation: professionalInfo.designation,
//     }

//     setProfile(updatedProfile)

//     localStorage.setItem(
//       'facultyProfile',
//       JSON.stringify(updatedProfile)
//     )

//     addActivity(
//       'Professional information updated'
//     )
//   }

//   // =====================================================
//   // FACULTY ACHIEVEMENTS
//   // =====================================================

//   const resetAchievementForm = () => {
//     setAchievementForm({
//       title: '',
//       category: '',
//       description: '',
//       date: '',
//     })

//     setEditingAchievementId(null)
//   }

//   const handleAchievementSubmit = () => {
//     if (
//       !achievementForm.title.trim() ||
//       !achievementForm.category ||
//       !achievementForm.description.trim() ||
//       !achievementForm.date
//     ) {
//       setAchievementMessage(
//         'Please fill all achievement fields.'
//       )
//       return
//     }

//     if (editingAchievementId !== null) {
//       const updated = achievements.map(
//         (achievement) =>
//           achievement.id === editingAchievementId
//             ? {
//                 ...achievement,
//                 ...achievementForm,
//               }
//             : achievement
//       )

//       setAchievements(updated)

//       localStorage.setItem(
//         'facultyAchievements',
//         JSON.stringify(updated)
//       )

//       setAchievementMessage(
//         'Achievement updated successfully.'
//       )

//       addActivity(
//         `Updated achievement: ${achievementForm.title}`
//       )
//     } else {
//       const newAchievement: Achievement = {
//         id: Date.now(),
//         ...achievementForm,
//       }

//       const updated = [
//         ...achievements,
//         newAchievement,
//       ]

//       setAchievements(updated)

//       localStorage.setItem(
//         'facultyAchievements',
//         JSON.stringify(updated)
//       )

//       setAchievementMessage(
//         'Achievement added successfully.'
//       )

//       addActivity(
//         `Added achievement: ${achievementForm.title}`
//       )
//     }

//     resetAchievementForm()
//   }

//   const editAchievement = (
//     achievement: Achievement
//   ) => {
//     setAchievementForm({
//       title: achievement.title,
//       category: achievement.category,
//       description: achievement.description,
//       date: achievement.date,
//     })

//     setEditingAchievementId(achievement.id)

//     setActiveSection('My Achievements')
//   }

//   const deleteAchievement = (id: number) => {
//     const achievement = achievements.find(
//       (item) => item.id === id
//     )

//     const updated = achievements.filter(
//       (item) => item.id !== id
//     )

//     setAchievements(updated)

//     localStorage.setItem(
//       'facultyAchievements',
//       JSON.stringify(updated)
//     )

//     addActivity(
//       `Deleted achievement: ${
//         achievement?.title || 'Achievement'
//       }`
//     )
//   }

//   // =====================================================
//   // STUDENT ACHIEVEMENTS
//   // =====================================================

//   const resetStudentAchievementForm = () => {
//     setStudentAchievementForm({
//       studentName: '',
//       title: '',
//       category: '',
//       description: '',
//       date: '',
//     })

//     setEditingStudentAchievementId(null)
//   }

//   const handleStudentAchievementSubmit = () => {
//     const {
//       studentName,
//       title,
//       category,
//       description,
//       date,
//     } = studentAchievementForm

//     if (
//       !studentName.trim() ||
//       !title.trim() ||
//       !category ||
//       !description.trim() ||
//       !date
//     ) {
//       setStudentAchievementMessage(
//         'Please fill all fields.'
//       )
//       return
//     }

//     if (
//       editingStudentAchievementId !== null
//     ) {
//       const updated = studentAchievements.map(
//         (achievement) =>
//           achievement.id ===
//           editingStudentAchievementId
//             ? {
//                 ...achievement,
//                 ...studentAchievementForm,
//               }
//             : achievement
//       )

//       setStudentAchievements(updated)

//       localStorage.setItem(
//         'studentAchievements',
//         JSON.stringify(updated)
//       )

//       setStudentAchievementMessage(
//         'Student achievement updated successfully.'
//       )

//       addActivity(
//         `Updated ${studentName}'s achievement`
//       )
//     } else {
//       const newAchievement: StudentAchievement = {
//         id: Date.now(),
//         ...studentAchievementForm,
//       }

//       const updated = [
//         ...studentAchievements,
//         newAchievement,
//       ]

//       setStudentAchievements(updated)

//       localStorage.setItem(
//         'studentAchievements',
//         JSON.stringify(updated)
//       )

//       setStudentAchievementMessage(
//         'Student achievement added successfully.'
//       )

//       addActivity(
//         `Added achievement for ${studentName}`
//       )
//     }

//     resetStudentAchievementForm()
//   }

//   const editStudentAchievement = (
//     achievement: StudentAchievement
//   ) => {
//     setStudentAchievementForm({
//       studentName: achievement.studentName,
//       title: achievement.title,
//       category: achievement.category,
//       description: achievement.description,
//       date: achievement.date,
//     })

//     setEditingStudentAchievementId(
//       achievement.id
//     )

//     setActiveSection(
//       'Add Student Achievement'
//     )
//   }

//   const deleteStudentAchievement = (
//     id: number
//   ) => {
//     const achievement =
//       studentAchievements.find(
//         (item) => item.id === id
//       )

//     const updated =
//       studentAchievements.filter(
//         (item) => item.id !== id
//       )

//     setStudentAchievements(updated)

//     localStorage.setItem(
//       'studentAchievements',
//       JSON.stringify(updated)
//     )

//     addActivity(
//       `Deleted ${achievement?.studentName || 'student'} achievement`
//     )
//   }

//   // =====================================================
//   // LMS - COURSE
//   // =====================================================

//   const addCourse = () => {
//     if (
//       !courseForm.name.trim() ||
//       !courseForm.code.trim()
//     ) {
//       setLmsMessage(
//         'Please enter course name and course code.'
//       )
//       return
//     }

//     const newCourse: Course = {
//       id: Date.now(),
//       name: courseForm.name,
//       code: courseForm.code,
//     }

//     const updated = [
//       ...courses,
//       newCourse,
//     ]

//     setCourses(updated)

//     localStorage.setItem(
//       'lmsCourses',
//       JSON.stringify(updated)
//     )

//     setCourseForm({
//       name: '',
//       code: '',
//     })

//     setLmsMessage(
//       'Course added successfully.'
//     )

//     addActivity(
//       `Added LMS course: ${newCourse.name}`
//     )
//   }

//   const deleteCourse = (id: number) => {
//     const updated = courses.filter(
//       (course) => course.id !== id
//     )

//     setCourses(updated)

//     localStorage.setItem(
//       'lmsCourses',
//       JSON.stringify(updated)
//     )

//     addActivity('Deleted LMS course')
//   }

//   // =====================================================
//   // LMS - ASSIGNMENT
//   // =====================================================

//   const addAssignment = () => {
//     if (
//       !assignmentForm.title.trim() ||
//       !assignmentForm.course.trim() ||
//       !assignmentForm.dueDate
//     ) {
//       setLmsMessage(
//         'Please fill all assignment fields.'
//       )
//       return
//     }

//     const newAssignment: Assignment = {
//       id: Date.now(),
//       ...assignmentForm,
//     }

//     const updated = [
//       ...assignments,
//       newAssignment,
//     ]

//     setAssignments(updated)

//     localStorage.setItem(
//       'lmsAssignments',
//       JSON.stringify(updated)
//     )

//     setAssignmentForm({
//       title: '',
//       course: '',
//       dueDate: '',
//     })

//     setLmsMessage(
//       'Assignment created successfully.'
//     )

//     addActivity(
//       `Created assignment: ${newAssignment.title}`
//     )
//   }

//   const deleteAssignment = (id: number) => {
//     const updated = assignments.filter(
//       (assignment) =>
//         assignment.id !== id
//     )

//     setAssignments(updated)

//     localStorage.setItem(
//       'lmsAssignments',
//       JSON.stringify(updated)
//     )

//     addActivity('Deleted LMS assignment')
//   }

//   // =====================================================
//   // LMS - MATERIAL
//   // =====================================================

//   const addMaterial = () => {
//     if (
//       !materialForm.title.trim() ||
//       !materialForm.course.trim()
//     ) {
//       setLmsMessage(
//         'Please enter material title and course.'
//       )
//       return
//     }

//     const newMaterial: Material = {
//       id: Date.now(),
//       ...materialForm,
//     }

//     const updated = [
//       ...materials,
//       newMaterial,
//     ]

//     setMaterials(updated)

//     localStorage.setItem(
//       'lmsMaterials',
//       JSON.stringify(updated)
//     )

//     setMaterialForm({
//       title: '',
//       course: '',
//     })

//     setLmsMessage(
//       'Learning material added successfully.'
//     )

//     addActivity(
//       `Added learning material: ${newMaterial.title}`
//     )
//   }

//   const deleteMaterial = (id: number) => {
//     const updated = materials.filter(
//       (material) => material.id !== id
//     )

//     setMaterials(updated)

//     localStorage.setItem(
//       'lmsMaterials',
//       JSON.stringify(updated)
//     )

//     addActivity(
//       'Deleted learning material'
//     )
//   }

//   // =====================================================
//   // AI ASSISTANT
//   // =====================================================

//   const organizeAchievements = () => {
//     if (achievements.length === 0) {
//       setAiResult(
//         'No faculty achievements are available to organize yet.'
//       )
//       return
//     }

//     const categories: Record<string, number> = {}

//     achievements.forEach((achievement) => {
//       categories[achievement.category] =
//         (categories[achievement.category] || 0) + 1
//     })

//     const result = Object.entries(categories)
//       .map(
//         ([category, count]) =>
//           `${category}: ${count} achievement${
//             count > 1 ? 's' : ''
//           }`
//       )
//       .join('\n')

//     setAiResult(
//       `Achievement Organization\n\n${result}\n\nTotal achievements: ${achievements.length}`
//     )

//     addActivity(
//       'AI organized faculty achievements'
//     )
//   }

//   const classifyStudentAchievements = () => {
//     if (studentAchievements.length === 0) {
//       setAiResult(
//         'No student achievements are available for classification yet.'
//       )
//       return
//     }

//     const categories: Record<string, number> = {}

//     studentAchievements.forEach(
//       (achievement) => {
//         categories[achievement.category] =
//           (categories[achievement.category] || 0) +
//           1
//       }
//     )

//     const result = Object.entries(categories)
//       .map(
//         ([category, count]) =>
//           `${category}: ${count}`
//       )
//       .join('\n')

//     setAiResult(
//       `Student Achievement Classification\n\n${result}\n\nTotal student achievements: ${studentAchievements.length}`
//     )

//     addActivity(
//       'AI classified student achievements'
//     )
//   }

//   const generateAchievementSummary = () => {
//     if (
//       achievements.length === 0 &&
//       studentAchievements.length === 0
//     ) {
//       setAiResult(
//         'There are no achievements available for generating a summary.'
//       )
//       return
//     }

//     setAiResult(
//       `Achievement Summary\n\nFaculty achievements: ${achievements.length}\nStudent achievements: ${studentAchievements.length}\n\nThe dashboard currently contains ${
//         achievements.length +
//         studentAchievements.length
//       } achievement records.`
//     )

//     addActivity(
//       'AI generated achievement summary'
//     )
//   }

//   // =====================================================
//   // SETTINGS
//   // =====================================================

//   const saveSettings = () => {
//     localStorage.setItem(
//       'facultySettings',
//       JSON.stringify({
//         notificationPreference,
//       })
//     )

//     setSettingsSaved(true)

//     addActivity('Dashboard settings updated')
//   }

//   // =====================================================
//   // DERIVED DATA
//   // =====================================================

//   const filteredStudentAchievements =
//     useMemo(() => {
//       const search =
//         studentSearch.toLowerCase().trim()

//       if (!search) {
//         return studentAchievements
//       }

//       return studentAchievements.filter(
//         (achievement) =>
//           achievement.studentName
//             .toLowerCase()
//             .includes(search) ||
//           achievement.title
//             .toLowerCase()
//             .includes(search) ||
//           achievement.category
//             .toLowerCase()
//             .includes(search)
//       )
//     }, [
//       studentAchievements,
//       studentSearch,
//     ])

//   const uniqueStudents = useMemo(() => {
//     return Array.from(
//       new Set(
//         studentAchievements.map(
//           (achievement) =>
//             achievement.studentName
//         )
//       )
//     )
//   }, [studentAchievements])

//   // =====================================================
//   // MENU
//   // =====================================================

//   const menuItems = [
//     'Dashboard',
//     'My Profile',
//     'Professional Information',
//     'My Achievements',
//     'Student Management',
//     'Student Achievements',
//     'Add Student Achievement',
//     'LMS',
//     'AI Assistant',
//     'Settings',
//   ]

//   return (
//     <div className="teacher-dashboard">

//       {/* ================================================= */}
//       {/* SIDEBAR */}
//       {/* ================================================= */}

//       <aside className="teacher-sidebar">

//         <div className="teacher-brand">

//           <div className="brand-icon">
//             F
//           </div>

//           <div>
//             <h2>Faculty Portal</h2>
//             <span>Teacher Dashboard</span>
//           </div>

//         </div>


//         <nav className="teacher-navigation">

//           {menuItems.map((item) => (
//             <button
//               key={item}
//               className={`teacher-nav-item ${
//                 activeSection === item
//                   ? 'active'
//                   : ''
//               }`}
//               onClick={() =>
//                 setActiveSection(item)
//               }
//             >
//               {item}
//             </button>
//           ))}

//         </nav>


//         <button
//           className="teacher-logout"
//           onClick={onLogout}
//         >
//           Sign Out
//         </button>

//       </aside>


//       {/* ================================================= */}
//       {/* MAIN */}
//       {/* ================================================= */}

//       <main className="teacher-main">

//         {/* HEADER */}

//         <header className="teacher-header">

//           <div>

//             <h1>
//               {activeSection}
//             </h1>

//             <p>
//               Welcome back,{' '}
//               {profile.name || name}
//             </p>

//           </div>


//           <div className="teacher-user">

//             <div className="teacher-avatar">
//               {(profile.name || name)
//                 .charAt(0)
//                 .toUpperCase()}
//             </div>

//             <div>

//               <strong>
//                 {profile.name || name}
//               </strong>

//               <span>
//                 {profile.designation ||
//                   'Teacher'}
//               </span>

//             </div>

//           </div>

//         </header>


//         {/* ================================================= */}
//         {/* DASHBOARD */}
//         {/* ================================================= */}

//         {activeSection === 'Dashboard' && (

//           <section className="teacher-content">

//             <div className="welcome-card">

//               <div>

//                 <h2>
//                   Welcome to your Faculty Dashboard
//                 </h2>

//                 <p>
//                   Manage your professional profile,
//                   achievements, students and LMS
//                   activities from one place.
//                 </p>

//               </div>

//             </div>


//             <div className="teacher-stats">

//               <div className="teacher-stat-card">

//                 <span className="stat-label">
//                   Students
//                 </span>

//                 <strong>
//                   {uniqueStudents.length}
//                 </strong>

//                 <p>
//                   Students with achievement records
//                 </p>

//               </div>


//               <div className="teacher-stat-card">

//                 <span className="stat-label">
//                   My Achievements
//                 </span>

//                 <strong>
//                   {achievements.length}
//                 </strong>

//                 <p>
//                   Professional achievements
//                 </p>

//               </div>


//               <div className="teacher-stat-card">

//                 <span className="stat-label">
//                   Student Achievements
//                 </span>

//                 <strong>
//                   {studentAchievements.length}
//                 </strong>

//                 <p>
//                   Achievement records
//                 </p>

//               </div>

//             </div>


//             <div className="teacher-stats">

//               <div className="teacher-stat-card">

//                 <span className="stat-label">
//                   LMS Courses
//                 </span>

//                 <strong>
//                   {courses.length}
//                 </strong>

//                 <p>
//                   Courses
//                 </p>

//               </div>


//               <div className="teacher-stat-card">

//                 <span className="stat-label">
//                   Assignments
//                 </span>

//                 <strong>
//                   {assignments.length}
//                 </strong>

//                 <p>
//                   Created assignments
//                 </p>

//               </div>


//               <div className="teacher-stat-card">

//                 <span className="stat-label">
//                   Learning Materials
//                 </span>

//                 <strong>
//                   {materials.length}
//                 </strong>

//                 <p>
//                   Uploaded materials
//                 </p>

//               </div>

//             </div>


//             <div className="teacher-card">

//               <h2>
//                 Quick Actions
//               </h2>


//               <div className="quick-actions">

//                 <button
//                   onClick={() =>
//                     setActiveSection(
//                       'My Profile'
//                     )
//                   }
//                 >
//                   Manage Profile
//                 </button>


//                 <button
//                   onClick={() =>
//                     setActiveSection(
//                       'Professional Information'
//                     )
//                   }
//                 >
//                   Professional Information
//                 </button>


//                 <button
//                   onClick={() =>
//                     setActiveSection(
//                       'My Achievements'
//                     )
//                   }
//                 >
//                   My Achievements
//                 </button>


//                 <button
//                   onClick={() =>
//                     setActiveSection(
//                       'Add Student Achievement'
//                     )
//                   }
//                 >
//                   Add Student Achievement
//                 </button>


//                 <button
//                   onClick={() =>
//                     setActiveSection('LMS')
//                   }
//                 >
//                   Open LMS
//                 </button>


//                 <button
//                   onClick={() =>
//                     setActiveSection(
//                       'AI Assistant'
//                     )
//                   }
//                 >
//                   Open AI Assistant
//                 </button>

//               </div>

//             </div>


//             <div className="teacher-card">

//               <h2>
//                 Recent Activity
//               </h2>


//               {activities.length === 0 ? (

//                 <div className="achievement-item">

//                   <h3>
//                     No recent activity
//                   </h3>

//                   <p>
//                     Your dashboard activity will
//                     appear here.
//                   </p>

//                 </div>

//               ) : (

//                 activities.map((activity) => (

//                   <div
//                     className="achievement-item"
//                     key={activity.id}
//                   >

//                     <h3>
//                       {activity.text}
//                     </h3>

//                     <p>
//                       {activity.date}
//                     </p>

//                   </div>

//                 ))

//               )}

//             </div>

//           </section>

//         )}


//         {/* ================================================= */}
//         {/* PROFILE */}
//         {/* ================================================= */}

//         {activeSection === 'My Profile' && (

//           <section className="teacher-content">

//             <div className="teacher-card">

//               <h2>
//                 My Profile
//               </h2>

//               <p className="section-description">
//                 Manage your basic faculty information.
//               </p>


//               <div className="teacher-form">

//                 <label>
//                   Full Name
//                 </label>

//                 <input
//                   type="text"
//                   value={profile.name}
//                   onChange={(e) =>
//                     handleProfileChange(
//                       'name',
//                       e.target.value
//                     )
//                   }
//                 />


//                 <label>
//                   Email
//                 </label>

//                 <input
//                   type="email"
//                   placeholder="Enter your email"
//                   value={profile.email}
//                   onChange={(e) =>
//                     handleProfileChange(
//                       'email',
//                       e.target.value
//                     )
//                   }
//                 />


//                 <label>
//                   Mobile Number
//                 </label>

//                 <input
//                   type="tel"
//                   placeholder="Enter mobile number"
//                   value={profile.mobile}
//                   onChange={(e) =>
//                     handleProfileChange(
//                       'mobile',
//                       e.target.value
//                     )
//                   }
//                 />


//                 <label>
//                   Faculty ID
//                 </label>

//                 <input
//                   type="text"
//                   placeholder="Enter faculty ID"
//                   value={profile.facultyId}
//                   onChange={(e) =>
//                     handleProfileChange(
//                       'facultyId',
//                       e.target.value
//                     )
//                   }
//                 />


//                 <label>
//                   Department
//                 </label>

//                 <input
//                   type="text"
//                   placeholder="Enter department"
//                   value={profile.department}
//                   onChange={(e) =>
//                     handleProfileChange(
//                       'department',
//                       e.target.value
//                     )
//                   }
//                 />


//                 <label>
//                   Designation
//                 </label>

//                 <input
//                   type="text"
//                   placeholder="Enter designation"
//                   value={profile.designation}
//                   onChange={(e) =>
//                     handleProfileChange(
//                       'designation',
//                       e.target.value
//                     )
//                   }
//                 />


//                 <button
//                   className="primary-button"
//                   onClick={handleProfileSave}
//                 >
//                   Save Profile
//                 </button>


//                 {profileSaved && (
//                   <p className="section-description">
//                     Profile saved successfully.
//                   </p>
//                 )}

//               </div>

//             </div>

//           </section>

//         )}


//         {/* ================================================= */}
//         {/* PROFESSIONAL INFORMATION */}
//         {/* ================================================= */}

//         {activeSection ===
//           'Professional Information' && (

//           <section className="teacher-content">

//             <div className="teacher-card">

//               <h2>
//                 Professional Information
//               </h2>

//               <p className="section-description">
//                 Add or update your professional details.
//               </p>


//               <div className="teacher-form">

//                 <label>
//                   Designation
//                 </label>

//                 <input
//                   type="text"
//                   placeholder="e.g. Assistant Professor"
//                   value={
//                     professionalInfo.designation
//                   }
//                   onChange={(e) =>
//                     handleProfessionalChange(
//                       'designation',
//                       e.target.value
//                     )
//                   }
//                 />


//                 <label>
//                   Department
//                 </label>

//                 <input
//                   type="text"
//                   placeholder="Enter department"
//                   value={
//                     professionalInfo.department
//                   }
//                   onChange={(e) =>
//                     handleProfessionalChange(
//                       'department',
//                       e.target.value
//                     )
//                   }
//                 />


//                 <label>
//                   Highest Qualification
//                 </label>

//                 <input
//                   type="text"
//                   placeholder="e.g. M.Tech, Ph.D."
//                   value={
//                     professionalInfo.qualification
//                   }
//                   onChange={(e) =>
//                     handleProfessionalChange(
//                       'qualification',
//                       e.target.value
//                     )
//                   }
//                 />


//                 <label>
//                   Years of Experience
//                 </label>

//                 <input
//                   type="number"
//                   min="0"
//                   placeholder="Enter experience"
//                   value={
//                     professionalInfo.experience
//                   }
//                   onChange={(e) =>
//                     handleProfessionalChange(
//                       'experience',
//                       e.target.value
//                     )
//                   }
//                 />


//                 <label>
//                   Specialization
//                 </label>

//                 <input
//                   type="text"
//                   placeholder="Enter specialization"
//                   value={
//                     professionalInfo.specialization
//                   }
//                   onChange={(e) =>
//                     handleProfessionalChange(
//                       'specialization',
//                       e.target.value
//                     )
//                   }
//                 />


//                 <label>
//                   Skills
//                 </label>

//                 <textarea
//                   rows={4}
//                   placeholder="Python, AI, Machine Learning..."
//                   value={
//                     professionalInfo.skills
//                   }
//                   onChange={(e) =>
//                     handleProfessionalChange(
//                       'skills',
//                       e.target.value
//                     )
//                   }
//                 />


//                 <button
//                   className="primary-button"
//                   onClick={
//                     handleProfessionalSave
//                   }
//                 >
//                   Save Information
//                 </button>


//                 {professionalSaved && (
//                   <p className="section-description">
//                     Professional information saved
//                     successfully.
//                   </p>
//                 )}

//               </div>

//             </div>

//           </section>

//         )}


//         {/* ================================================= */}
//         {/* MY ACHIEVEMENTS */}
//         {/* ================================================= */}

//         {activeSection === 'My Achievements' && (

//           <section className="teacher-content">

//             <div className="teacher-card">

//               <div className="card-heading">

//                 <div>

//                   <h2>
//                     My Achievements
//                   </h2>

//                   <p className="section-description">
//                     Manage your professional achievements.
//                   </p>

//                 </div>


//                 <button
//                   className="primary-button"
//                   onClick={() => {
//                     resetAchievementForm()
//                     setAchievementMessage('')
//                     setActiveSection(
//                       'My Achievements'
//                     )
//                   }}
//                 >
//                   + Add Achievement
//                 </button>

//               </div>


//               {/* ACHIEVEMENT FORM */}

//               <div className="teacher-form">

//                 <label>
//                   Achievement Title
//                 </label>

//                 <input
//                   type="text"
//                   placeholder="e.g. Best Faculty Award"
//                   value={
//                     achievementForm.title
//                   }
//                   onChange={(e) =>
//                     setAchievementForm(
//                       (previous) => ({
//                         ...previous,
//                         title: e.target.value,
//                       })
//                     )
//                   }
//                 />


//                 <label>
//                   Category
//                 </label>

//                 <select
//                   value={
//                     achievementForm.category
//                   }
//                   onChange={(e) =>
//                     setAchievementForm(
//                       (previous) => ({
//                         ...previous,
//                         category:
//                           e.target.value,
//                       })
//                     )
//                   }
//                 >

//                   <option value="">
//                     Select category
//                   </option>

//                   <option value="Academic">
//                     Academic
//                   </option>

//                   <option value="Research">
//                     Research
//                   </option>

//                   <option value="Teaching">
//                     Teaching
//                   </option>

//                   <option value="Award">
//                     Award
//                   </option>

//                   <option value="Certification">
//                     Certification
//                   </option>

//                   <option value="Competition">
//                     Competition
//                   </option>

//                   <option value="Other">
//                     Other
//                   </option>

//                 </select>


//                 <label>
//                   Description
//                 </label>

//                 <textarea
//                   rows={4}
//                   placeholder="Describe your achievement"
//                   value={
//                     achievementForm.description
//                   }
//                   onChange={(e) =>
//                     setAchievementForm(
//                       (previous) => ({
//                         ...previous,
//                         description:
//                           e.target.value,
//                       })
//                     )
//                   }
//                 />


//                 <label>
//                   Date
//                 </label>

//                 <input
//                   type="date"
//                   value={
//                     achievementForm.date
//                   }
//                   onChange={(e) =>
//                     setAchievementForm(
//                       (previous) => ({
//                         ...previous,
//                         date: e.target.value,
//                       })
//                     )
//                   }
//                 />


//                 <div className="quick-actions">

//                   <button
//                     className="primary-button"
//                     onClick={
//                       handleAchievementSubmit
//                     }
//                   >
//                     {editingAchievementId !== null
//                       ? 'Update Achievement'
//                       : 'Save Achievement'}
//                   </button>


//                   {editingAchievementId !== null && (
//                     <button
//                       onClick={
//                         resetAchievementForm
//                       }
//                     >
//                       Cancel Edit
//                     </button>
//                   )}

//                 </div>


//                 {achievementMessage && (
//                   <p className="section-description">
//                     {achievementMessage}
//                   </p>
//                 )}

//               </div>


//               <h3>
//                 Saved Achievements
//               </h3>


//               {achievements.length === 0 ? (

//                 <div className="achievement-item">

//                   <h3>
//                     No achievements yet
//                   </h3>

//                   <p>
//                     Add your first professional
//                     achievement using the form above.
//                   </p>

//                 </div>

//               ) : (

//                 achievements.map(
//                   (achievement) => (

//                     <div
//                       className="achievement-item"
//                       key={achievement.id}
//                     >

//                       <h3>
//                         {achievement.title}
//                       </h3>

//                       <p>
//                         <strong>
//                           {achievement.category}
//                         </strong>{' '}
//                         • {achievement.date}
//                       </p>

//                       <p>
//                         {achievement.description}
//                       </p>


//                       <div className="quick-actions">

//                         <button
//                           onClick={() =>
//                             editAchievement(
//                               achievement
//                             )
//                           }
//                         >
//                           Edit
//                         </button>


//                         <button
//                           onClick={() =>
//                             deleteAchievement(
//                               achievement.id
//                             )
//                           }
//                         >
//                           Delete
//                         </button>

//                       </div>

//                     </div>

//                   )
//                 )

//               )}

//             </div>

//           </section>

//         )}


//         {/* ================================================= */}
//         {/* STUDENT MANAGEMENT */}
//         {/* ================================================= */}

//         {activeSection ===
//           'Student Management' && (

//           <section className="teacher-content">

//             <div className="teacher-card">

//               <h2>
//                 Student Management
//               </h2>

//               <p className="section-description">
//                 View students based on recorded achievement
//                 information.
//               </p>


//               <div className="teacher-form">

//                 <label>
//                   Search Student
//                 </label>

//                 <input
//                   type="text"
//                   placeholder="Search by student name..."
//                   value={studentSearch}
//                   onChange={(e) =>
//                     setStudentSearch(
//                       e.target.value
//                     )
//                   }
//                 />

//               </div>


//               <div className="table-wrapper">

//                 <table className="student-table">

//                   <thead>

//                     <tr>

//                       <th>
//                         Student Name
//                       </th>

//                       <th>
//                         Achievements
//                       </th>

//                       <th>
//                         Action
//                       </th>

//                     </tr>

//                   </thead>


//                   <tbody>

//                     {uniqueStudents
//                       .filter((student) =>
//                         student
//                           .toLowerCase()
//                           .includes(
//                             studentSearch
//                               .toLowerCase()
//                           )
//                       )
//                       .map((student) => {

//                         const count =
//                           studentAchievements.filter(
//                             (achievement) =>
//                               achievement.studentName ===
//                               student
//                           ).length

//                         return (
//                           <tr key={student}>

//                             <td>
//                               {student}
//                             </td>

//                             <td>
//                               {count}
//                             </td>

//                             <td>

//                               <button
//                                 className="table-button"
//                                 onClick={() => {
//                                   setStudentSearch(
//                                     student
//                                   )

//                                   setActiveSection(
//                                     'Student Achievements'
//                                   )
//                                 }}
//                               >
//                                 View
//                               </button>

//                             </td>

//                           </tr>
//                         )
//                       })}


//                     {uniqueStudents.length ===
//                       0 && (

//                       <tr>

//                         <td
//                           colSpan={3}
//                         >
//                           No student achievement records
//                           available yet.
//                         </td>

//                       </tr>

//                     )}

//                   </tbody>

//                 </table>

//               </div>


//               <div className="quick-actions">

//                 <button
//                   className="primary-button"
//                   onClick={() =>
//                     setActiveSection(
//                       'Add Student Achievement'
//                     )
//                   }
//                 >
//                   + Add Student Achievement
//                 </button>

//               </div>

//             </div>

//           </section>

//         )}


//         {/* ================================================= */}
//         {/* STUDENT ACHIEVEMENTS */}
//         {/* ================================================= */}

//         {activeSection ===
//           'Student Achievements' && (

//           <section className="teacher-content">

//             <div className="teacher-card">

//               <div className="card-heading">

//                 <div>

//                   <h2>
//                     Student Achievements
//                   </h2>

//                   <p className="section-description">
//                     View, update and manage student
//                     achievement records.
//                   </p>

//                 </div>


//                 <button
//                   className="primary-button"
//                   onClick={() => {
//                     resetStudentAchievementForm()
//                     setStudentAchievementMessage('')
//                     setActiveSection(
//                       'Add Student Achievement'
//                     )
//                   }}
//                 >
//                   + Add Achievement
//                 </button>

//               </div>


//               <div className="teacher-form">

//                 <label>
//                   Search
//                 </label>

//                 <input
//                   type="text"
//                   placeholder="Search student, achievement or category..."
//                   value={studentSearch}
//                   onChange={(e) =>
//                     setStudentSearch(
//                       e.target.value
//                     )
//                   }
//                 />

//               </div>


//               {filteredStudentAchievements.length ===
//               0 ? (

//                 <div className="achievement-item">

//                   <h3>
//                     No student achievements found
//                   </h3>

//                   <p>
//                     Add a student achievement to see
//                     it here.
//                   </p>

//                 </div>

//               ) : (

//                 filteredStudentAchievements.map(
//                   (achievement) => (

//                     <div
//                       className="achievement-item"
//                       key={achievement.id}
//                     >

//                       <h3>
//                         {achievement.title}
//                       </h3>

//                       <p>
//                         <strong>
//                           {achievement.studentName}
//                         </strong>
//                       </p>

//                       <p>
//                         {achievement.category} •{' '}
//                         {achievement.date}
//                       </p>

//                       <p>
//                         {achievement.description}
//                       </p>


//                       <div className="quick-actions">

//                         <button
//                           onClick={() =>
//                             editStudentAchievement(
//                               achievement
//                             )
//                           }
//                         >
//                           Edit
//                         </button>


//                         <button
//                           onClick={() =>
//                             deleteStudentAchievement(
//                               achievement.id
//                             )
//                           }
//                         >
//                           Delete
//                         </button>

//                       </div>

//                     </div>

//                   )
//                 )

//               )}

//             </div>

//           </section>

//         )}


//         {/* ================================================= */}
//         {/* ADD STUDENT ACHIEVEMENT */}
//         {/* ================================================= */}

//         {activeSection ===
//           'Add Student Achievement' && (

//           <section className="teacher-content">

//             <div className="teacher-card">

//               <h2>
//                 {editingStudentAchievementId !==
//                 null
//                   ? 'Update Student Achievement'
//                   : 'Add Student Achievement'}
//               </h2>

//               <p className="section-description">
//                 Record an achievement for a student.
//               </p>


//               <div className="teacher-form">

//                 <label>
//                   Student Name
//                 </label>

//                 <input
//                   type="text"
//                   placeholder="Enter student name"
//                   value={
//                     studentAchievementForm.studentName
//                   }
//                   onChange={(e) =>
//                     setStudentAchievementForm(
//                       (previous) => ({
//                         ...previous,
//                         studentName:
//                           e.target.value,
//                       })
//                     )
//                   }
//                 />


//                 <label>
//                   Achievement Title
//                 </label>

//                 <input
//                   type="text"
//                   placeholder="e.g. Hackathon Winner"
//                   value={
//                     studentAchievementForm.title
//                   }
//                   onChange={(e) =>
//                     setStudentAchievementForm(
//                       (previous) => ({
//                         ...previous,
//                         title:
//                           e.target.value,
//                       })
//                     )
//                   }
//                 />


//                 <label>
//                   Achievement Category
//                 </label>

//                 <select
//                   value={
//                     studentAchievementForm.category
//                   }
//                   onChange={(e) =>
//                     setStudentAchievementForm(
//                       (previous) => ({
//                         ...previous,
//                         category:
//                           e.target.value,
//                       })
//                     )
//                   }
//                 >

//                   <option value="">
//                     Select category
//                   </option>

//                   <option value="Academic">
//                     Academic
//                   </option>

//                   <option value="Sports">
//                     Sports
//                   </option>

//                   <option value="Competition">
//                     Competition
//                   </option>

//                   <option value="Certification">
//                     Certification
//                   </option>

//                   <option value="Cultural">
//                     Cultural
//                   </option>

//                   <option value="Other">
//                     Other
//                   </option>

//                 </select>


//                 <label>
//                   Description
//                 </label>

//                 <textarea
//                   rows={5}
//                   placeholder="Describe the achievement"
//                   value={
//                     studentAchievementForm.description
//                   }
//                   onChange={(e) =>
//                     setStudentAchievementForm(
//                       (previous) => ({
//                         ...previous,
//                         description:
//                           e.target.value,
//                       })
//                     )
//                   }
//                 />


//                 <label>
//                   Date
//                 </label>

//                 <input
//                   type="date"
//                   value={
//                     studentAchievementForm.date
//                   }
//                   onChange={(e) =>
//                     setStudentAchievementForm(
//                       (previous) => ({
//                         ...previous,
//                         date: e.target.value,
//                       })
//                     )
//                   }
//                 />


//                 <div className="quick-actions">

//                   <button
//                     className="primary-button"
//                     onClick={
//                       handleStudentAchievementSubmit
//                     }
//                   >
//                     {editingStudentAchievementId !==
//                     null
//                       ? 'Update Achievement'
//                       : 'Add Achievement'}
//                   </button>


//                   {editingStudentAchievementId !==
//                     null && (

//                     <button
//                       onClick={
//                         resetStudentAchievementForm
//                       }
//                     >
//                       Cancel
//                     </button>

//                   )}

//                 </div>


//                 {studentAchievementMessage && (

//                   <p className="section-description">
//                     {studentAchievementMessage}
//                   </p>

//                 )}

//               </div>

//             </div>

//           </section>

//         )}


//         {/* ================================================= */}
//         {/* LMS */}
//         {/* ================================================= */}

//         {activeSection === 'LMS' && (

//           <section className="teacher-content">

//             <div className="teacher-card">

//               <h2>
//                 Learning Management System
//               </h2>

//               <p className="section-description">
//                 Manage courses, assignments and learning
//                 materials.
//               </p>


//               {/* LMS STATS */}

//               <div className="teacher-stats">

//                 <div className="teacher-stat-card">

//                   <span className="stat-label">
//                     Courses
//                   </span>

//                   <strong>
//                     {courses.length}
//                   </strong>

//                   <p>
//                     Active courses
//                   </p>

//                 </div>


//                 <div className="teacher-stat-card">

//                   <span className="stat-label">
//                     Assignments
//                   </span>

//                   <strong>
//                     {assignments.length}
//                   </strong>

//                   <p>
//                     Created assignments
//                   </p>

//                 </div>


//                 <div className="teacher-stat-card">

//                   <span className="stat-label">
//                     Materials
//                   </span>

//                   <strong>
//                     {materials.length}
//                   </strong>

//                   <p>
//                     Learning resources
//                   </p>

//                 </div>

//               </div>


//               {/* COURSES */}

//               <h3>
//                 Courses
//               </h3>


//               <div className="teacher-form">

//                 <label>
//                   Course Name
//                 </label>

//                 <input
//                   type="text"
//                   placeholder="e.g. Artificial Intelligence"
//                   value={courseForm.name}
//                   onChange={(e) =>
//                     setCourseForm(
//                       (previous) => ({
//                         ...previous,
//                         name: e.target.value,
//                       })
//                     )
//                   }
//                 />


//                 <label>
//                   Course Code
//                 </label>

//                 <input
//                   type="text"
//                   placeholder="e.g. AI-301"
//                   value={courseForm.code}
//                   onChange={(e) =>
//                     setCourseForm(
//                       (previous) => ({
//                         ...previous,
//                         code: e.target.value,
//                       })
//                     )
//                   }
//                 />


//                 <button
//                   className="primary-button"
//                   onClick={addCourse}
//                 >
//                   Add Course
//                 </button>

//               </div>


//               {courses.map((course) => (

//                 <div
//                   className="achievement-item"
//                   key={course.id}
//                 >

//                   <h3>
//                     {course.name}
//                   </h3>

//                   <p>
//                     Course Code: {course.code}
//                   </p>

//                   <button
//                     onClick={() =>
//                       deleteCourse(course.id)
//                     }
//                   >
//                     Delete
//                   </button>

//                 </div>

//               ))}


//               {/* ASSIGNMENTS */}

//               <h3>
//                 Assignments
//               </h3>


//               <div className="teacher-form">

//                 <label>
//                   Assignment Title
//                 </label>

//                 <input
//                   type="text"
//                   placeholder="Enter assignment title"
//                   value={
//                     assignmentForm.title
//                   }
//                   onChange={(e) =>
//                     setAssignmentForm(
//                       (previous) => ({
//                         ...previous,
//                         title: e.target.value,
//                       })
//                     )
//                   }
//                 />


//                 <label>
//                   Course
//                 </label>

//                 <input
//                   type="text"
//                   placeholder="Enter course"
//                   value={
//                     assignmentForm.course
//                   }
//                   onChange={(e) =>
//                     setAssignmentForm(
//                       (previous) => ({
//                         ...previous,
//                         course: e.target.value,
//                       })
//                     )
//                   }
//                 />


//                 <label>
//                   Due Date
//                 </label>

//                 <input
//                   type="date"
//                   value={
//                     assignmentForm.dueDate
//                   }
//                   onChange={(e) =>
//                     setAssignmentForm(
//                       (previous) => ({
//                         ...previous,
//                         dueDate:
//                           e.target.value,
//                       })
//                     )
//                   }
//                 />


//                 <button
//                   className="primary-button"
//                   onClick={addAssignment}
//                 >
//                   Create Assignment
//                 </button>

//               </div>


//               {assignments.map(
//                 (assignment) => (

//                   <div
//                     className="achievement-item"
//                     key={assignment.id}
//                   >

//                     <h3>
//                       {assignment.title}
//                     </h3>

//                     <p>
//                       {assignment.course} • Due:{' '}
//                       {assignment.dueDate}
//                     </p>

//                     <button
//                       onClick={() =>
//                         deleteAssignment(
//                           assignment.id
//                         )
//                       }
//                     >
//                       Delete
//                     </button>

//                   </div>

//                 )
//               )}


//               {/* MATERIALS */}

//               <h3>
//                 Learning Materials
//               </h3>


//               <div className="teacher-form">

//                 <label>
//                   Material Title
//                 </label>

//                 <input
//                   type="text"
//                   placeholder="e.g. Unit 1 Notes"
//                   value={
//                     materialForm.title
//                   }
//                   onChange={(e) =>
//                     setMaterialForm(
//                       (previous) => ({
//                         ...previous,
//                         title: e.target.value,
//                       })
//                     )
//                   }
//                 />


//                 <label>
//                   Course
//                 </label>

//                 <input
//                   type="text"
//                   placeholder="Enter course"
//                   value={
//                     materialForm.course
//                   }
//                   onChange={(e) =>
//                     setMaterialForm(
//                       (previous) => ({
//                         ...previous,
//                         course: e.target.value,
//                       })
//                     )
//                   }
//                 />


//                 <button
//                   className="primary-button"
//                   onClick={addMaterial}
//                 >
//                   Add Material
//                 </button>

//               </div>


//               {materials.map((material) => (

//                 <div
//                   className="achievement-item"
//                   key={material.id}
//                 >

//                   <h3>
//                     {material.title}
//                   </h3>

//                   <p>
//                     Course: {material.course}
//                   </p>

//                   <button
//                     onClick={() =>
//                       deleteMaterial(
//                         material.id
//                       )
//                     }
//                   >
//                     Delete
//                   </button>

//                 </div>

//               ))}


//               {lmsMessage && (

//                 <p className="section-description">
//                   {lmsMessage}
//                 </p>

//               )}

//             </div>

//           </section>

//         )}


//         {/* ================================================= */}
//         {/* AI ASSISTANT */}
//         {/* ================================================= */}

//         {activeSection ===
//           'AI Assistant' && (

//           <section className="teacher-content">

//             <div className="teacher-card">

//               <h2>
//                 AI Assistant
//               </h2>

//               <p className="section-description">
//                 AI-powered tools for organizing and
//                 understanding achievement data.
//               </p>


//               <div className="quick-actions">

//                 <button
//                   onClick={
//                     organizeAchievements
//                   }
//                 >
//                   Organize Achievements
//                 </button>


//                 <button
//                   onClick={
//                     classifyStudentAchievements
//                   }
//                 >
//                   Classify Student Achievements
//                 </button>


//                 <button
//                   onClick={
//                     generateAchievementSummary
//                   }
//                 >
//                   Generate Achievement Summary
//                 </button>

//               </div>


//               {aiResult && (

//                 <div className="achievement-item">

//                   <h3>
//                     AI Result
//                   </h3>

//                   <p
//                     style={{
//                       whiteSpace: 'pre-line',
//                     }}
//                   >
//                     {aiResult}
//                   </p>

//                 </div>

//               )}


//               {!aiResult && (

//                 <div className="achievement-item">

//                   <h3>
//                     AI Assistant Ready
//                   </h3>

//                   <p>
//                     Select an AI action above to
//                     analyze your achievement data.
//                   </p>

//                 </div>

//               )}

//             </div>

//           </section>

//         )}


//         {/* ================================================= */}
//         {/* SETTINGS */}
//         {/* ================================================= */}

//         {activeSection === 'Settings' && (

//           <section className="teacher-content">

//             <div className="teacher-card">

//               <h2>
//                 Settings
//               </h2>

//               <p className="section-description">
//                 Manage your dashboard preferences.
//               </p>


//               <div className="teacher-form">

//                 <label>
//                   Account Email
//                 </label>

//                 <input
//                   type="email"
//                   value={profile.email}
//                   placeholder="Enter account email"
//                   onChange={(e) =>
//                     handleProfileChange(
//                       'email',
//                       e.target.value
//                     )
//                   }
//                 />


//                 <label>
//                   Notification Preference
//                 </label>

//                 <select
//                   value={
//                     notificationPreference
//                   }
//                   onChange={(e) => {
//                     setNotificationPreference(
//                       e.target.value
//                     )

//                     setSettingsSaved(false)
//                   }}
//                 >

//                   <option value="all">
//                     All Notifications
//                   </option>

//                   <option value="important">
//                     Important Only
//                   </option>

//                   <option value="none">
//                     Disable Notifications
//                   </option>

//                 </select>


//                 <button
//                   className="primary-button"
//                   onClick={saveSettings}
//                 >
//                   Save Settings
//                 </button>


//                 {settingsSaved && (

//                   <p className="section-description">
//                     Settings saved successfully.
//                   </p>

//                 )}

//               </div>


//               <div className="quick-actions">

//                 <button onClick={onLogout}>
//                   Sign Out
//                 </button>

//               </div>

//             </div>

//           </section>

//         )}

//       </main>

//     </div>
//   )
// }

// export default TeacherDashboard

import { useEffect, useMemo, useState } from 'react'
import './TeacherDashboard.css'

type TeacherDashboardProps = {
  name: string
  onLogout: () => void
}

type Achievement = {
  id: number
  title: string
  category: string
  description: string
  date: string
}

type StudentAchievement = Achievement & {
  studentName: string
}

type Course = {
  id: number
  name: string
  code: string
}

type Assignment = {
  id: number
  title: string
  course: string
  dueDate: string
}

type Material = {
  id: number
  title: string
  course: string
}

type Activity = {
  id: number
  text: string
  date: string
}

function TeacherDashboard({
  name,
  onLogout,
}: TeacherDashboardProps) {
  const [activeSection, setActiveSection] = useState('Dashboard')

  // =====================================================
  // PROFILE
  // =====================================================

  const [profile, setProfile] = useState({
    name: name,
    email: '',
    mobile: '',
    facultyId: '',
    department: '',
    designation: '',
  })

  const [profileSaved, setProfileSaved] = useState(false)

  // =====================================================
  // PROFESSIONAL INFORMATION
  // =====================================================

  const [professionalInfo, setProfessionalInfo] = useState({
    designation: '',
    department: '',
    qualification: '',
    experience: '',
    specialization: '',
    skills: '',
  })

  const [professionalSaved, setProfessionalSaved] =
    useState(false)

  // =====================================================
  // FACULTY ACHIEVEMENTS
  // =====================================================

  const [achievements, setAchievements] = useState<
    Achievement[]
  >([])

  const [achievementForm, setAchievementForm] = useState({
    title: '',
    category: '',
    description: '',
    date: '',
  })

  const [editingAchievementId, setEditingAchievementId] =
    useState<number | null>(null)

  const [achievementMessage, setAchievementMessage] =
    useState('')

  // =====================================================
  // STUDENT ACHIEVEMENTS
  // =====================================================

  const [studentAchievements, setStudentAchievements] =
    useState<StudentAchievement[]>([])

  const [studentAchievementForm, setStudentAchievementForm] =
    useState({
      studentName: '',
      title: '',
      category: '',
      description: '',
      date: '',
    })

  const [
    editingStudentAchievementId,
    setEditingStudentAchievementId,
  ] = useState<number | null>(null)

  const [
    studentAchievementMessage,
    setStudentAchievementMessage,
  ] = useState('')

  // =====================================================
  // LMS
  // =====================================================

  const [courses, setCourses] = useState<Course[]>([])

  const [assignments, setAssignments] = useState<Assignment[]>(
    []
  )

  const [materials, setMaterials] = useState<Material[]>([])

  const [courseForm, setCourseForm] = useState({
    name: '',
    code: '',
  })

  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    course: '',
    dueDate: '',
  })

  const [materialForm, setMaterialForm] = useState({
    title: '',
    course: '',
  })

  const [lmsMessage, setLmsMessage] = useState('')

  // =====================================================
  // ASSIGNMENT REMINDER
  // =====================================================

  const [reminderForm, setReminderForm] = useState({
    title: '',
    subject: '',
    dueDate: '',
    message: '',
  })

  const [assignmentReminders, setAssignmentReminders] = useState<{
    id: number
    title: string
    subject: string
    dueDate: string
    message: string
  }[]>([])

  const createAssignmentReminder = () => {
    if (
      !reminderForm.title.trim() ||
      !reminderForm.subject.trim() ||
      !reminderForm.dueDate
    ) {
      return
    }

    setAssignmentReminders((current) => [
      ...current,
      {
        id: Date.now(),
        ...reminderForm,
      },
    ])

    addActivity(`Assignment reminder created for ${reminderForm.title}`)

    setReminderForm({
      title: '',
      subject: '',
      dueDate: '',
      message: '',
    })
  }

  const deleteAssignmentReminder = (id: number) => {
    setAssignmentReminders((current) =>
      current.filter((reminder) => reminder.id !== id)
    )
  }

  // =====================================================
  // AI ASSIGNMENT EVALUATOR
  // =====================================================

  const checkAttendance = () => {
    const percentage = Number(attendancePercentage)
    const threshold = Number(attendanceThreshold)

    if (!attendanceStudent.trim() || !attendancePercentage.trim()) {
      return
    }

    if (Number.isNaN(percentage) || Number.isNaN(threshold)) {
      return
    }

    const safe = percentage >= threshold

    setAttendanceResult({
      status: safe ? 'safe' : 'warning',
      message: safe
        ? `${attendanceStudent} is meeting the minimum attendance requirement.`
        : `${attendanceStudent} is below the minimum attendance requirement and should receive an attendance warning.`,
      percentage,
      threshold,
    })

    addActivity(
      safe
        ? `Attendance checked for ${attendanceStudent}`
        : `Attendance alert generated for ${attendanceStudent}`
    )
  }

  const evaluateAssignment = () => {
    if (!evaluationAssignment.trim() || !studentAnswer.trim()) {
      return
    }

    setEvaluationResult({
      score: 8.5,
      feedback:
        'The answer demonstrates a good understanding of the topic. The main concepts are explained correctly, but the explanation can be made more detailed.',
      strengths: [
        'Correct understanding of the core concept',
        'Relevant explanation',
        'Good use of technical terminology',
      ],
      improvements: [
        'Add more supporting examples',
        'Improve explanation of advanced concepts',
        'Provide a clearer conclusion',
      ],
    })

    addActivity('AI evaluated a student assignment')
  }

  // =====================================================
  // SETTINGS
  // =====================================================

  const [notificationPreference, setNotificationPreference] =
    useState('all')

  const [settingsSaved, setSettingsSaved] = useState(false)

  // =====================================================
  // AI ASSISTANT
  // =====================================================

  const [aiResult, setAiResult] = useState('')

  // =====================================================
  // AI ASSIGNMENT EVALUATOR
  // =====================================================

  // =====================================================
  // ATTENDANCE ALERT
  // =====================================================

  const [attendanceStudent, setAttendanceStudent] =
    useState('')

  const [attendancePercentage, setAttendancePercentage] =
    useState('')

  const [attendanceThreshold, setAttendanceThreshold] =
    useState('75')

  const [attendanceResult, setAttendanceResult] =
    useState<{
      status: 'safe' | 'warning'
      message: string
      percentage: number
      threshold: number
    } | null>(null)

  const [evaluationAssignment, setEvaluationAssignment] =
    useState('')

  const [studentAnswer, setStudentAnswer] =
    useState('')

  const [evaluationResult, setEvaluationResult] =
    useState<{
      score: number
      feedback: string
      strengths: string[]
      improvements: string[]
    } | null>(null)

  // =====================================================
  // ACTIVITY
  // =====================================================

  const [activities, setActivities] = useState<Activity[]>([])

  // =====================================================
  // SEARCH
  // =====================================================

  const [studentSearch, setStudentSearch] = useState('')

  // =====================================================
  // LOAD DATA FROM LOCAL STORAGE
  // =====================================================

  useEffect(() => {
    try {
      const savedProfile =
        localStorage.getItem('facultyProfile')

      if (savedProfile) {
        setProfile(JSON.parse(savedProfile))
      }

      const savedProfessional =
        localStorage.getItem(
          'facultyProfessionalInfo'
        )

      if (savedProfessional) {
        setProfessionalInfo(
          JSON.parse(savedProfessional)
        )
      }

      const savedAchievements =
        localStorage.getItem('facultyAchievements')

      if (savedAchievements) {
        setAchievements(
          JSON.parse(savedAchievements)
        )
      }

      const savedStudentAchievements =
        localStorage.getItem(
          'studentAchievements'
        )

      if (savedStudentAchievements) {
        setStudentAchievements(
          JSON.parse(savedStudentAchievements)
        )
      }

      const savedCourses =
        localStorage.getItem('lmsCourses')

      if (savedCourses) {
        setCourses(JSON.parse(savedCourses))
      }

      const savedAssignments =
        localStorage.getItem('lmsAssignments')

      if (savedAssignments) {
        setAssignments(JSON.parse(savedAssignments))
      }

      const savedMaterials =
        localStorage.getItem('lmsMaterials')

      if (savedMaterials) {
        setMaterials(JSON.parse(savedMaterials))
      }

      const savedActivities =
        localStorage.getItem('facultyActivities')

      if (savedActivities) {
        setActivities(JSON.parse(savedActivities))
      }

      const savedSettings =
        localStorage.getItem('facultySettings')

      if (savedSettings) {
        const settings = JSON.parse(savedSettings)

        setNotificationPreference(
          settings.notificationPreference || 'all'
        )
      }
    } catch {
      console.log('Unable to load saved dashboard data')
    }
  }, [])

  // =====================================================
  // ACTIVITY HELPER
  // =====================================================

  const addActivity = (text: string) => {
    const activity: Activity = {
      id: Date.now(),
      text,
      date: new Date().toLocaleString(),
    }

    setActivities((previous) => {
      const updated = [activity, ...previous].slice(0, 8)

      localStorage.setItem(
        'facultyActivities',
        JSON.stringify(updated)
      )

      return updated
    })
  }

  // =====================================================
  // PROFILE
  // =====================================================

  const handleProfileChange = (
    field: string,
    value: string
  ) => {
    setProfile((previous) => ({
      ...previous,
      [field]: value,
    }))

    setProfileSaved(false)
  }

  const handleProfileSave = () => {
    localStorage.setItem(
      'facultyProfile',
      JSON.stringify(profile)
    )

    setProfileSaved(true)

    addActivity('Faculty profile updated')
  }

  // =====================================================
  // PROFESSIONAL INFORMATION
  // =====================================================

  const handleProfessionalChange = (
    field: string,
    value: string
  ) => {
    setProfessionalInfo((previous) => ({
      ...previous,
      [field]: value,
    }))

    setProfessionalSaved(false)
  }

  const handleProfessionalSave = () => {
    localStorage.setItem(
      'facultyProfessionalInfo',
      JSON.stringify(professionalInfo)
    )

    setProfessionalSaved(true)

    const updatedProfile = {
      ...profile,
      department: professionalInfo.department,
      designation: professionalInfo.designation,
    }

    setProfile(updatedProfile)

    localStorage.setItem(
      'facultyProfile',
      JSON.stringify(updatedProfile)
    )

    addActivity(
      'Professional information updated'
    )
  }

  // =====================================================
  // FACULTY ACHIEVEMENTS
  // =====================================================

  const resetAchievementForm = () => {
    setAchievementForm({
      title: '',
      category: '',
      description: '',
      date: '',
    })

    setEditingAchievementId(null)
  }

  const handleAchievementSubmit = () => {
    if (
      !achievementForm.title.trim() ||
      !achievementForm.category ||
      !achievementForm.description.trim() ||
      !achievementForm.date
    ) {
      setAchievementMessage(
        'Please fill all achievement fields.'
      )
      return
    }

    if (editingAchievementId !== null) {
      const updated = achievements.map(
        (achievement) =>
          achievement.id === editingAchievementId
            ? {
                ...achievement,
                ...achievementForm,
              }
            : achievement
      )

      setAchievements(updated)

      localStorage.setItem(
        'facultyAchievements',
        JSON.stringify(updated)
      )

      setAchievementMessage(
        'Achievement updated successfully.'
      )

      addActivity(
        `Updated achievement: ${achievementForm.title}`
      )
    } else {
      const newAchievement: Achievement = {
        id: Date.now(),
        ...achievementForm,
      }

      const updated = [
        ...achievements,
        newAchievement,
      ]

      setAchievements(updated)

      localStorage.setItem(
        'facultyAchievements',
        JSON.stringify(updated)
      )

      setAchievementMessage(
        'Achievement added successfully.'
      )

      addActivity(
        `Added achievement: ${achievementForm.title}`
      )
    }

    resetAchievementForm()
  }

  const editAchievement = (
    achievement: Achievement
  ) => {
    setAchievementForm({
      title: achievement.title,
      category: achievement.category,
      description: achievement.description,
      date: achievement.date,
    })

    setEditingAchievementId(achievement.id)

    setActiveSection('My Achievements')
  }

  const deleteAchievement = (id: number) => {
    const achievement = achievements.find(
      (item) => item.id === id
    )

    const updated = achievements.filter(
      (item) => item.id !== id
    )

    setAchievements(updated)

    localStorage.setItem(
      'facultyAchievements',
      JSON.stringify(updated)
    )

    addActivity(
      `Deleted achievement: ${
        achievement?.title || 'Achievement'
      }`
    )
  }

  // =====================================================
  // STUDENT ACHIEVEMENTS
  // =====================================================

  const resetStudentAchievementForm = () => {
    setStudentAchievementForm({
      studentName: '',
      title: '',
      category: '',
      description: '',
      date: '',
    })

    setEditingStudentAchievementId(null)
  }

  const handleStudentAchievementSubmit = () => {
    const {
      studentName,
      title,
      category,
      description,
      date,
    } = studentAchievementForm

    if (
      !studentName.trim() ||
      !title.trim() ||
      !category ||
      !description.trim() ||
      !date
    ) {
      setStudentAchievementMessage(
        'Please fill all fields.'
      )
      return
    }

    if (
      editingStudentAchievementId !== null
    ) {
      const updated = studentAchievements.map(
        (achievement) =>
          achievement.id ===
          editingStudentAchievementId
            ? {
                ...achievement,
                ...studentAchievementForm,
              }
            : achievement
      )

      setStudentAchievements(updated)

      localStorage.setItem(
        'studentAchievements',
        JSON.stringify(updated)
      )

      setStudentAchievementMessage(
        'Student achievement updated successfully.'
      )

      addActivity(
        `Updated ${studentName}'s achievement`
      )
    } else {
      const newAchievement: StudentAchievement = {
        id: Date.now(),
        ...studentAchievementForm,
      }

      const updated = [
        ...studentAchievements,
        newAchievement,
      ]

      setStudentAchievements(updated)

      localStorage.setItem(
        'studentAchievements',
        JSON.stringify(updated)
      )

      setStudentAchievementMessage(
        'Student achievement added successfully.'
      )

      addActivity(
        `Added achievement for ${studentName}`
      )
    }

    resetStudentAchievementForm()
  }

  const editStudentAchievement = (
    achievement: StudentAchievement
  ) => {
    setStudentAchievementForm({
      studentName: achievement.studentName,
      title: achievement.title,
      category: achievement.category,
      description: achievement.description,
      date: achievement.date,
    })

    setEditingStudentAchievementId(
      achievement.id
    )

    setActiveSection(
      'Add Student Achievement'
    )
  }

  const deleteStudentAchievement = (
    id: number
  ) => {
    const achievement =
      studentAchievements.find(
        (item) => item.id === id
      )

    const updated =
      studentAchievements.filter(
        (item) => item.id !== id
      )

    setStudentAchievements(updated)

    localStorage.setItem(
      'studentAchievements',
      JSON.stringify(updated)
    )

    addActivity(
      `Deleted ${achievement?.studentName || 'student'} achievement`
    )
  }

  // =====================================================
  // LMS - COURSE
  // =====================================================

  const addCourse = () => {
    if (
      !courseForm.name.trim() ||
      !courseForm.code.trim()
    ) {
      setLmsMessage(
        'Please enter course name and course code.'
      )
      return
    }

    const newCourse: Course = {
      id: Date.now(),
      name: courseForm.name,
      code: courseForm.code,
    }

    const updated = [
      ...courses,
      newCourse,
    ]

    setCourses(updated)

    localStorage.setItem(
      'lmsCourses',
      JSON.stringify(updated)
    )

    setCourseForm({
      name: '',
      code: '',
    })

    setLmsMessage(
      'Course added successfully.'
    )

    addActivity(
      `Added LMS course: ${newCourse.name}`
    )
  }

  const deleteCourse = (id: number) => {
    const updated = courses.filter(
      (course) => course.id !== id
    )

    setCourses(updated)

    localStorage.setItem(
      'lmsCourses',
      JSON.stringify(updated)
    )

    addActivity('Deleted LMS course')
  }

  // =====================================================
  // LMS - ASSIGNMENT
  // =====================================================

  const addAssignment = () => {
    if (
      !assignmentForm.title.trim() ||
      !assignmentForm.course.trim() ||
      !assignmentForm.dueDate
    ) {
      setLmsMessage(
        'Please fill all assignment fields.'
      )
      return
    }

    const newAssignment: Assignment = {
      id: Date.now(),
      ...assignmentForm,
    }

    const updated = [
      ...assignments,
      newAssignment,
    ]

    setAssignments(updated)

    localStorage.setItem(
      'lmsAssignments',
      JSON.stringify(updated)
    )

    setAssignmentForm({
      title: '',
      course: '',
      dueDate: '',
    })

    setLmsMessage(
      'Assignment created successfully.'
    )

    addActivity(
      `Created assignment: ${newAssignment.title}`
    )
  }

  const deleteAssignment = (id: number) => {
    const updated = assignments.filter(
      (assignment) =>
        assignment.id !== id
    )

    setAssignments(updated)

    localStorage.setItem(
      'lmsAssignments',
      JSON.stringify(updated)
    )

    addActivity('Deleted LMS assignment')
  }

  // =====================================================
  // LMS - MATERIAL
  // =====================================================

  const addMaterial = () => {
    if (
      !materialForm.title.trim() ||
      !materialForm.course.trim()
    ) {
      setLmsMessage(
        'Please enter material title and course.'
      )
      return
    }

    const newMaterial: Material = {
      id: Date.now(),
      ...materialForm,
    }

    const updated = [
      ...materials,
      newMaterial,
    ]

    setMaterials(updated)

    localStorage.setItem(
      'lmsMaterials',
      JSON.stringify(updated)
    )

    setMaterialForm({
      title: '',
      course: '',
    })

    setLmsMessage(
      'Learning material added successfully.'
    )

    addActivity(
      `Added learning material: ${newMaterial.title}`
    )
  }

  const deleteMaterial = (id: number) => {
    const updated = materials.filter(
      (material) => material.id !== id
    )

    setMaterials(updated)

    localStorage.setItem(
      'lmsMaterials',
      JSON.stringify(updated)
    )

    addActivity(
      'Deleted learning material'
    )
  }

  // =====================================================
  // AI ASSISTANT
  // =====================================================

  const organizeAchievements = () => {
    if (achievements.length === 0) {
      setAiResult(
        'No faculty achievements are available to organize yet.'
      )
      return
    }

    const categories: Record<string, number> = {}

    achievements.forEach((achievement) => {
      categories[achievement.category] =
        (categories[achievement.category] || 0) + 1
    })

    const result = Object.entries(categories)
      .map(
        ([category, count]) =>
          `${category}: ${count} achievement${
            count > 1 ? 's' : ''
          }`
      )
      .join('\n')

    setAiResult(
      `Achievement Organization\n\n${result}\n\nTotal achievements: ${achievements.length}`
    )

    addActivity(
      'AI organized faculty achievements'
    )
  }

  const classifyStudentAchievements = () => {
    if (studentAchievements.length === 0) {
      setAiResult(
        'No student achievements are available for classification yet.'
      )
      return
    }

    const categories: Record<string, number> = {}

    studentAchievements.forEach(
      (achievement) => {
        categories[achievement.category] =
          (categories[achievement.category] || 0) +
          1
      }
    )

    const result = Object.entries(categories)
      .map(
        ([category, count]) =>
          `${category}: ${count}`
      )
      .join('\n')

    setAiResult(
      `Student Achievement Classification\n\n${result}\n\nTotal student achievements: ${studentAchievements.length}`
    )

    addActivity(
      'AI classified student achievements'
    )
  }

  const generateAchievementSummary = () => {
    if (
      achievements.length === 0 &&
      studentAchievements.length === 0
    ) {
      setAiResult(
        'There are no achievements available for generating a summary.'
      )
      return
    }

    setAiResult(
      `Achievement Summary\n\nFaculty achievements: ${achievements.length}\nStudent achievements: ${studentAchievements.length}\n\nThe dashboard currently contains ${
        achievements.length +
        studentAchievements.length
      } achievement records.`
    )

    addActivity(
      'AI generated achievement summary'
    )
  }

  // =====================================================
  // SETTINGS
  // =====================================================

  const saveSettings = () => {
    localStorage.setItem(
      'facultySettings',
      JSON.stringify({
        notificationPreference,
      })
    )

    setSettingsSaved(true)

    addActivity('Dashboard settings updated')
  }

  // =====================================================
  // DERIVED DATA
  // =====================================================

  const filteredStudentAchievements =
    useMemo(() => {
      const search =
        studentSearch.toLowerCase().trim()

      if (!search) {
        return studentAchievements
      }

      return studentAchievements.filter(
        (achievement) =>
          achievement.studentName
            .toLowerCase()
            .includes(search) ||
          achievement.title
            .toLowerCase()
            .includes(search) ||
          achievement.category
            .toLowerCase()
            .includes(search)
      )
    }, [
      studentAchievements,
      studentSearch,
    ])

  const uniqueStudents = useMemo(() => {
    return Array.from(
      new Set(
        studentAchievements.map(
          (achievement) =>
            achievement.studentName
        )
      )
    )
  }, [studentAchievements])

  // =====================================================
  // MENU
  // =====================================================

  const menuItems = [
    'Dashboard',
    'My Profile',
    'Professional Information',
    'My Achievements',
    'Student Management',
    'Student Achievements',
    'Add Student Achievement',
    'LMS',
    'AI Assignment Evaluator',
    'Attendance Alert',
    'Assignment Reminder',
    'AI Assistant',
    'Settings',
  ]

  return (
    <div className="teacher-dashboard">

      {/* ================================================= */}
      {/* SIDEBAR */}
      {/* ================================================= */}

      <aside className="teacher-sidebar">

        <div className="teacher-brand">

          <div className="brand-icon">
            F
          </div><div>
            <h2>Faculty Portal</h2>
            <span>Teacher Dashboard</span>
          </div>

        </div>


        <nav className="teacher-navigation">

          {menuItems.map((item) => (
            <button
              key={item}
              className={`teacher-nav-item ${
                activeSection === item
                  ? 'active'
                  : ''
              }`}
              onClick={() =>
                setActiveSection(item)
              }
            >
              {item}
            </button>
          ))}

        </nav>


        <button
          className="teacher-logout"
          onClick={onLogout}
        >
          Sign Out
        </button>

      </aside>


      {/* ================================================= */}
      {/* MAIN */}
      {/* ================================================= */}

      <main className="teacher-main">

        {/* HEADER */}

        <header className="teacher-header">

          <div>

            <h1>
              {activeSection}
            </h1>

            <p>
              Welcome back,{' '}
              {profile.name || name}
            </p>

          </div>


          <div className="teacher-user">

            <div className="teacher-avatar">
              {(profile.name || name)
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>

              <strong>
                {profile.name || name}
              </strong>

              <span>
                {profile.designation ||
                  'Teacher'}
              </span>

            </div>

          </div>

        </header>


        {/* ================================================= */}
        {/* DASHBOARD */}
        {/* ================================================= */}

        {activeSection === 'Dashboard' && (

          <section className="teacher-content">

            <div className="welcome-card">

              <div>

                <h2>
                  Welcome to your Faculty Dashboard
                </h2>

                <p>
                  Manage your professional profile,
                  achievements, students and LMS
                  activities from one place.
                </p>

              </div>

            </div>


            <div className="teacher-stats">

              <div className="teacher-stat-card">

                <span className="stat-label">
                  Students
                </span>

                <strong>
                  {uniqueStudents.length}
                </strong>

                <p>
                  Students with achievement records
                </p>

              </div>


              <div className="teacher-stat-card">

                <span className="stat-label">
                  My Achievements
                </span>

                <strong>
                  {achievements.length}
                </strong>

                <p>
                  Professional achievements
                </p>

              </div>


              <div className="teacher-stat-card">

                <span className="stat-label">
                  Student Achievements
                </span>

                <strong>
                  {studentAchievements.length}
                </strong>

                <p>
                  Achievement records
                </p>

              </div>

            </div>


            <div className="teacher-stats">

              <div className="teacher-stat-card">

                <span className="stat-label">
                  LMS Courses
                </span>

                <strong>
                  {courses.length}
                </strong>

                <p>
                  Courses
                </p>

              </div>


              <div className="teacher-stat-card">

                <span className="stat-label">
                  Assignments
                </span>

                <strong>
                  {assignments.length}
                </strong>

                <p>
                  Created assignments
                </p>

              </div>


              <div className="teacher-stat-card">

                <span className="stat-label">
                  Learning Materials
                </span>

                <strong>
                  {materials.length}
                </strong>

                <p>
                  Uploaded materials
                </p>

              </div>

            </div>


            <div className="teacher-card">

              <h2>
                Quick Actions
              </h2>


              <div className="quick-actions">

                <button
                  onClick={() =>
                    setActiveSection(
                      'My Profile'
                    )
                  }
                >
                  Manage Profile
                </button>


                <button
                  onClick={() =>
                    setActiveSection(
                      'Professional Information'
                    )
                  }
                >
                  Professional Information
                </button>


                <button
                  onClick={() =>
                    setActiveSection(
                      'My Achievements'
                    )
                  }
                >
                  My Achievements
                </button>


                <button
                  onClick={() =>
                    setActiveSection(
                      'Add Student Achievement'
                    )
                  }
                >
                  Add Student Achievement
                </button>


                <button
                  onClick={() =>
                    setActiveSection('LMS')
                  }
                >
                  Open LMS
                </button>


                <button
                  onClick={() =>
                    setActiveSection(
                      'AI Assistant'
                    )
                  }
                >
                  Open AI Assistant
                </button>

              </div>

            </div>


            <div className="teacher-card">

              <h2>
                Recent Activity
              </h2>


              {activities.length === 0 ? (

                <div className="achievement-item">

                  <h3>
                    No recent activity
                  </h3>

                  <p>
                    Your dashboard activity will
                    appear here.
                  </p>

                </div>

              ) : (

                activities.map((activity) => (

                  <div
                    className="achievement-item"
                    key={activity.id}
                  >

                    <h3>
                      {activity.text}
                    </h3>

                    <p>
                      {activity.date}
                    </p>

                  </div>

                ))

              )}

            </div>

          </section>

        )}


        {/* ================================================= */}
        {/* PROFILE */}
        {/* ================================================= */}

        {activeSection === 'My Profile' && (

          <section className="teacher-content">

            <div className="teacher-card">

              <h2>
                My Profile
              </h2>

              <p className="section-description">
                Manage your basic faculty information.
              </p>


              <div className="teacher-form">

                <label>
                  Full Name
                </label>

                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) =>
                    handleProfileChange(
                      'name',
                      e.target.value
                    )
                  }
                />


                <label>
                  Email
                </label>

                <input
                  type="email"
                  placeholder="Enter your email"
                  value={profile.email}
                  onChange={(e) =>
                    handleProfileChange(
                      'email',
                      e.target.value
                    )
                  }
                />


                <label>
                  Mobile Number
                </label>

                <input
                  type="tel"
                  placeholder="Enter mobile number"
                  value={profile.mobile}
                  onChange={(e) =>
                    handleProfileChange(
                      'mobile',
                      e.target.value
                    )
                  }
                />


                <label>
                  Faculty ID
                </label>

                <input
                  type="text"
                  placeholder="Enter faculty ID"
                  value={profile.facultyId}
                  onChange={(e) =>
                    handleProfileChange(
                      'facultyId',
                      e.target.value
                    )
                  }
                />


                <label>
                  Department
                </label>

                <input
                  type="text"
                  placeholder="Enter department"
                  value={profile.department}
                  onChange={(e) =>
                    handleProfileChange(
                      'department',
                      e.target.value
                    )
                  }
                />


                <label>
                  Designation
                </label>

                <input
                  type="text"
                  placeholder="Enter designation"
                  value={profile.designation}
                  onChange={(e) =>
                    handleProfileChange(
                      'designation',
                      e.target.value
                    )
                  }
                />


                <button
                  className="primary-button"
                  onClick={handleProfileSave}
                >
                  Save Profile
                </button>


                {profileSaved && (
                  <p className="section-description">
                    Profile saved successfully.
                  </p>
                )}

              </div>

            </div>

          </section>

        )}


        {/* ================================================= */}
        {/* PROFESSIONAL INFORMATION */}
        {/* ================================================= */}

        {activeSection ===
          'Professional Information' && (

          <section className="teacher-content">

            <div className="teacher-card">

              <h2>
                Professional Information
              </h2>

              <p className="section-description">
                Add or update your professional details.
              </p>


              <div className="teacher-form">

                <label>
                  Designation
                </label>

                <input
                  type="text"
                  placeholder="e.g. Assistant Professor"
                  value={
                    professionalInfo.designation
                  }
                  onChange={(e) =>
                    handleProfessionalChange(
                      'designation',
                      e.target.value
                    )
                  }
                />


                <label>
                  Department
                </label>

                <input
                  type="text"
                  placeholder="Enter department"
                  value={
                    professionalInfo.department
                  }
                  onChange={(e) =>
                    handleProfessionalChange(
                      'department',
                      e.target.value
                    )
                  }
                />


                <label>
                  Highest Qualification
                </label>

                <input
                  type="text"
                  placeholder="e.g. M.Tech, Ph.D."
                  value={
                    professionalInfo.qualification
                  }
                  onChange={(e) =>
                    handleProfessionalChange(
                      'qualification',
                      e.target.value
                    )
                  }
                />


                <label>
                  Years of Experience
                </label>

                <input
                  type="number"
                  min="0"
                  placeholder="Enter experience"
                  value={
                    professionalInfo.experience
                  }
                  onChange={(e) =>
                    handleProfessionalChange(
                      'experience',
                      e.target.value
                    )
                  }
                />


                <label>
                  Specialization
                </label>

                <input
                  type="text"
                  placeholder="Enter specialization"
                  value={
                    professionalInfo.specialization
                  }
                  onChange={(e) =>
                    handleProfessionalChange(
                      'specialization',
                      e.target.value
                    )
                  }
                />


                <label>
                  Skills
                </label>

                <textarea
                  rows={4}
                  placeholder="Python, AI, Machine Learning..."
                  value={
                    professionalInfo.skills
                  }
                  onChange={(e) =>
                    handleProfessionalChange(
                      'skills',
                      e.target.value
                    )
                  }
                />


                <button
                  className="primary-button"
                  onClick={
                    handleProfessionalSave
                  }
                >
                  Save Information
                </button>


                {professionalSaved && (
                  <p className="section-description">
                    Professional information saved
                    successfully.
                  </p>
                )}

              </div>

            </div>

          </section>

        )}


        {/* ================================================= */}
        {/* MY ACHIEVEMENTS */}
        {/* ================================================= */}

        {activeSection === 'My Achievements' && (

          <section className="teacher-content">

            <div className="teacher-card">

              <div className="card-heading">

                <div>

                  <h2>
                    My Achievements
                  </h2>

                  <p className="section-description">
                    Manage your professional achievements.
                  </p>

                </div>


                <button
                  className="primary-button"
                  onClick={() => {
                    resetAchievementForm()
                    setAchievementMessage('')
                    setActiveSection(
                      'My Achievements'
                    )
                  }}
                >
                  + Add Achievement
                </button>

              </div>


              {/* ACHIEVEMENT FORM */}

              <div className="teacher-form">

                <label>
                  Achievement Title
                </label>

                <input
                  type="text"
                  placeholder="e.g. Best Faculty Award"
                  value={
                    achievementForm.title
                  }
                  onChange={(e) =>
                    setAchievementForm(
                      (previous) => ({
                        ...previous,
                        title: e.target.value,
                      })
                    )
                  }
                />


                <label>
                  Category
                </label>

                <select
                  value={
                    achievementForm.category
                  }
                  onChange={(e) =>
                    setAchievementForm(
                      (previous) => ({
                        ...previous,
                        category:
                          e.target.value,
                      })
                    )
                  }
                >

                  <option value="">
                    Select category
                  </option>

                  <option value="Academic">
                    Academic
                  </option>

                  <option value="Research">
                    Research
                  </option>

                  <option value="Teaching">
                    Teaching
                  </option>

                  <option value="Award">
                    Award
                  </option>

                  <option value="Certification">
                    Certification
                  </option>

                  <option value="Competition">
                    Competition
                  </option>

                  <option value="Other">
                    Other
                  </option>

                </select>


                <label>
                  Description
                </label>

                <textarea
                  rows={4}
                  placeholder="Describe your achievement"
                  value={
                    achievementForm.description
                  }
                  onChange={(e) =>
                    setAchievementForm(
                      (previous) => ({
                        ...previous,
                        description:
                          e.target.value,
                      })
                    )
                  }
                />


                <label>
                  Date
                </label>

                <input
                  type="date"
                  value={
                    achievementForm.date
                  }
                  onChange={(e) =>
                    setAchievementForm(
                      (previous) => ({
                        ...previous,
                        date: e.target.value,
                      })
                    )
                  }
                />


                <div className="quick-actions">

                  <button
                    className="primary-button"
                    onClick={
                      handleAchievementSubmit
                    }
                  >
                    {editingAchievementId !== null
                      ? 'Update Achievement'
                      : 'Save Achievement'}
                  </button>


                  {editingAchievementId !== null && (
                    <button
                      onClick={
                        resetAchievementForm
                      }
                    >
                      Cancel Edit
                    </button>
                  )}

                </div>


                {achievementMessage && (
                  <p className="section-description">
                    {achievementMessage}
                  </p>
                )}

              </div>


              <h3>
                Saved Achievements
              </h3>


              {achievements.length === 0 ? (

                <div className="achievement-item">

                  <h3>
                    No achievements yet
                  </h3>

                  <p>
                    Add your first professional
                    achievement using the form above.
                  </p>

                </div>

              ) : (

                achievements.map(
                  (achievement) => (

                    <div
                      className="achievement-item"
                      key={achievement.id}
                    >

                      <h3>
                        {achievement.title}
                      </h3>

                      <p>
                        <strong>
                          {achievement.category}
                        </strong>{' '}
                        • {achievement.date}
                      </p>

                      <p>
                        {achievement.description}
                      </p>


                      <div className="quick-actions">

                        <button
                          onClick={() =>
                            editAchievement(
                              achievement
                            )
                          }
                        >
                          Edit
                        </button>


                        <button
                          onClick={() =>
                            deleteAchievement(
                              achievement.id
                            )
                          }
                        >
                          Delete
                        </button>

                      </div>

                    </div>

                  )
                )

              )}

            </div>

          </section>

        )}


        {/* ================================================= */}
        {/* STUDENT MANAGEMENT */}
        {/* ================================================= */}

        {activeSection ===
          'Student Management' && (

          <section className="teacher-content">

            <div className="teacher-card">

              <h2>
                Student Management
              </h2>

              <p className="section-description">
                View students based on recorded achievement
                information.
              </p>


              <div className="teacher-form">

                <label>
                  Search Student
                </label>

                <input
                  type="text"
                  placeholder="Search by student name..."
                  value={studentSearch}
                  onChange={(e) =>
                    setStudentSearch(
                      e.target.value
                    )
                  }
                />

              </div>


              <div className="table-wrapper">

                <table className="student-table">

                  <thead>

                    <tr>

                      <th>
                        Student Name
                      </th>

                      <th>Achievements
                      </th>

                      <th>
                        Action
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {uniqueStudents
                      .filter((student) =>
                        student
                          .toLowerCase()
                          .includes(
                            studentSearch
                              .toLowerCase()
                          )
                      )
                      .map((student) => {

                        const count =
                          studentAchievements.filter(
                            (achievement) =>
                              achievement.studentName ===
                              student
                          ).length

                        return (
                          <tr key={student}>

                            <td>
                              {student}
                            </td>

                            <td>
                              {count}
                            </td>

                            <td>

                              <button
                                className="table-button"
                                onClick={() => {
                                  setStudentSearch(
                                    student
                                  )

                                  setActiveSection(
                                    'Student Achievements'
                                  )
                                }}
                              >
                                View
                              </button>

                            </td>

                          </tr>
                        )
                      })}


                    {uniqueStudents.length ===
                      0 && (

                      <tr>

                        <td
                          colSpan={3}
                        >
                          No student achievement records
                          available yet.
                        </td>

                      </tr>

                    )}

                  </tbody>

                </table>

              </div>


              <div className="quick-actions">

                <button
                  className="primary-button"
                  onClick={() =>
                    setActiveSection(
                      'Add Student Achievement'
                    )
                  }
                >
                  + Add Student Achievement
                </button>

              </div>

            </div>

          </section>

        )}


        {/* ================================================= */}
        {/* STUDENT ACHIEVEMENTS */}
        {/* ================================================= */}

        {activeSection ===
          'Student Achievements' && (

          <section className="teacher-content">

            <div className="teacher-card">

              <div className="card-heading">

                <div>

                  <h2>
                    Student Achievements
                  </h2>

                  <p className="section-description">
                    View, update and manage student
                    achievement records.
                  </p>

                </div>


                <button
                  className="primary-button"
                  onClick={() => {
                    resetStudentAchievementForm()
                    setStudentAchievementMessage('')
                    setActiveSection(
                      'Add Student Achievement'
                    )
                  }}
                >
                  + Add Achievement
                </button>

              </div>


              <div className="teacher-form">

                <label>
                  Search
                </label>

                <input
                  type="text"
                  placeholder="Search student, achievement or category..."
                  value={studentSearch}
                  onChange={(e) =>
                    setStudentSearch(
                      e.target.value
                    )
                  }
                />

              </div>


              {filteredStudentAchievements.length ===
              0 ? (

                <div className="achievement-item">

                  <h3>
                    No student achievements found
                  </h3>

                  <p>
                    Add a student achievement to see
                    it here.
                  </p>

                </div>

              ) : (

                filteredStudentAchievements.map(
                  (achievement) => (

                    <div
                      className="achievement-item"
                      key={achievement.id}
                    >

                      <h3>
                        {achievement.title}
                      </h3>

                      <p>
                        <strong>
                          {achievement.studentName}
                        </strong>
                      </p>

                      <p>
                        {achievement.category} •{' '}
                        {achievement.date}
                      </p>

                      <p>
                        {achievement.description}
                      </p>


                      <div className="quick-actions">

                        <button
                          onClick={() =>
                            editStudentAchievement(
                              achievement
                            )
                          }
                        >
                          Edit
                        </button>


                        <button
                          onClick={() =>
                            deleteStudentAchievement(
                              achievement.id
                            )
                          }
                        >
                          Delete
                        </button>

                      </div>

                    </div>

                  )
                )

              )}

            </div>

          </section>

        )}


        {/* ================================================= */}
        {/* ADD STUDENT ACHIEVEMENT */}
        {/* ================================================= */}

        {activeSection ===
          'Add Student Achievement' && (

          <section className="teacher-content">

            <div className="teacher-card">

              <h2>
                {editingStudentAchievementId !==
                null
                  ? 'Update Student Achievement'
                  : 'Add Student Achievement'}
              </h2>

              <p className="section-description">
                Record an achievement for a student.
              </p>


              <div className="teacher-form">

                <label>
                  Student Name
                </label>

                <input
                  type="text"
                  placeholder="Enter student name"
                  value={
                    studentAchievementForm.studentName
                  }
                  onChange={(e) =>
                    setStudentAchievementForm(
                      (previous) => ({
                        ...previous,
                        studentName:
                          e.target.value,
                      })
                    )
                  }
                />


                <label>
                  Achievement Title
                </label>

                <input
                  type="text"
                  placeholder="e.g. Hackathon Winner"
                  value={
                    studentAchievementForm.title
                  }
                  onChange={(e) =>
                    setStudentAchievementForm(
                      (previous) => ({
                        ...previous,
                        title:
                          e.target.value,
                      })
                    )
                  }
                />


                <label>
                  Achievement Category
                </label>

                <select
                  value={
                    studentAchievementForm.category
                  }
                  onChange={(e) =>
                    setStudentAchievementForm(
                      (previous) => ({
                        ...previous,
                        category:
                          e.target.value,
                      })
                    )
                  }
                >

                  <option value="">
                    Select category
                  </option>

                  <option value="Academic">
                    Academic
                  </option>

                  <option value="Sports">
                    Sports
                  </option>

                  <option value="Competition">
                    Competition
                  </option>

                  <option value="Certification">
                    Certification
                  </option>

                  <option value="Cultural">
                    Cultural
                  </option>

                  <option value="Other">
                    Other
                  </option>

                </select>


                <label>
                  Description
                </label>

                <textarea
                  rows={5}
                  placeholder="Describe the achievement"
                  value={
                    studentAchievementForm.description
                  }
                  onChange={(e) =>
                    setStudentAchievementForm(
                      (previous) => ({
                        ...previous,
                        description:
                          e.target.value,
                      })
                    )
                  }
                />


                <label>
                  Date
                </label>

                <input
                  type="date"
                  value={
                    studentAchievementForm.date
                  }
                  onChange={(e) =>
                    setStudentAchievementForm(
                      (previous) => ({
                        ...previous,
                        date: e.target.value,
                      })
                    )
                  }
                />


                <div className="quick-actions">

                  <button
                    className="primary-button"
                    onClick={
                      handleStudentAchievementSubmit
                    }
                  >
                    {editingStudentAchievementId !==
                    null
                      ? 'Update Achievement'
                      : 'Add Achievement'}
                  </button>


                  {editingStudentAchievementId !==
                    null && (

                    <button
                      onClick={
                        resetStudentAchievementForm
                      }
                    >
                      Cancel
                    </button>

                  )}

                </div>


                {studentAchievementMessage && (

                  <p className="section-description">
                    {studentAchievementMessage}
                  </p>

                )}

              </div>

            </div>

          </section>

        )}


        {/* ================================================= */}
        {/* LMS */}
        {/* ================================================= */}

        {activeSection === 'LMS' && (

          <section className="teacher-content">

            <div className="teacher-card">

              <h2>
                Learning Management System
              </h2>

              <p className="section-description">
                Manage courses, assignments and learning
                materials.
              </p>


              {/* LMS STATS */}

              <div className="teacher-stats">

                <div className="teacher-stat-card">

                  <span className="stat-label">
                    Courses
                  </span>

                  <strong>
                    {courses.length}
                  </strong>

                  <p>
                    Active courses
                  </p>

                </div>


                <div className="teacher-stat-card">

                  <span className="stat-label">
                    Assignments
                  </span>

                  <strong>
                    {assignments.length}
                  </strong>

                  <p>
                    Created assignments
                  </p>

                </div>


                <div className="teacher-stat-card">

                  <span className="stat-label">
                    Materials
                  </span>

                  <strong>
                    {materials.length}
                  </strong>

                  <p>
                    Learning resources
                  </p>

                </div>

              </div>


              {/* COURSES */}

              <h3>
                Courses
              </h3>


              <div className="teacher-form">

                <label>
                  Course Name
                </label>

                <input
                  type="text"
                  placeholder="e.g. Artificial Intelligence"
                  value={courseForm.name}
                  onChange={(e) =>
                    setCourseForm(
                      (previous) => ({
                        ...previous,
                        name: e.target.value,
                      })
                    )
                  }
                />


                <label>
                  Course Code
                </label>

                <input
                  type="text"
                  placeholder="e.g. AI-301"
                  value={courseForm.code}
                  onChange={(e) =>
                    setCourseForm(
                      (previous) => ({
                        ...previous,
                        code: e.target.value,
                      })
                    )
                  }
                />


                <button
                  className="primary-button"
                  onClick={addCourse}
                >
                  Add Course
                </button>

              </div>


              {courses.map((course) => (

                <div
                  className="achievement-item"
                  key={course.id}
                >

                  <h3>
                    {course.name}
                  </h3>

                  <p>
                    Course Code: {course.code}
                  </p>

                  <button
                    onClick={() =>
                      deleteCourse(course.id)
                    }
                  >
                    Delete
                  </button>

                </div>

              ))}


              {/* ASSIGNMENTS */}

              <h3>
                Assignments
              </h3>


              <div className="teacher-form">

                <label>
                  Assignment Title
                </label>

                <input
                  type="text"
                  placeholder="Enter assignment title"
                  value={
                    assignmentForm.title
                  }
                  onChange={(e) =>
                    setAssignmentForm(
                      (previous) => ({
                        ...previous,
                        title: e.target.value,
                      })
                    )
                  }
                />


                <label>
                  Course
                </label>

                <input
                  type="text"
                  placeholder="Enter course"
                  value={
                    assignmentForm.course
                  }
                  onChange={(e) =>
                    setAssignmentForm(
                      (previous) => ({
                        ...previous,
                        course: e.target.value,
                      })
                    )
                  }
                />


                <label>
                  Due Date
                </label>

                <input
                  type="date"
                  value={
                    assignmentForm.dueDate
                  }
                  onChange={(e) =>
                    setAssignmentForm(
                      (previous) => ({
                        ...previous,
                        dueDate:
                          e.target.value,
                      })
                    )
                  }
                />


                <button
                  className="primary-button"
                  onClick={addAssignment}
                >
                  Create Assignment
                </button>

              </div>


              {assignments.map(
                (assignment) => (

                  <div
                    className="achievement-item"
                    key={assignment.id}
                  >

                    <h3>
                      {assignment.title}
                    </h3>

                    <p>
                      {assignment.course} • Due:{' '}
                      {assignment.dueDate}
                    </p>

                    <button
                      onClick={() =>
                        deleteAssignment(
                          assignment.id
                        )
                      }
                    >
                      Delete
                    </button>

                  </div>

                )
              )}


              {/* MATERIALS */}

              <h3>
                Learning Materials
              </h3>


              <div className="teacher-form">

                <label>
                  Material Title
                </label>

                <input
                  type="text"
                  placeholder="e.g. Unit 1 Notes"
                  value={
                    materialForm.title
                  }
                  onChange={(e) =>
                    setMaterialForm(
                      (previous) => ({
                        ...previous,
                        title: e.target.value,
                      })
                    )
                  }
                />


                <label>
                  Course
                </label>

                <input
                  type="text"
                  placeholder="Enter course"
                  value={
                    materialForm.course
                  }
                  onChange={(e) =>
                    setMaterialForm(
                      (previous) => ({
                        ...previous,
                        course: e.target.value,
                      })
                    )
                  }
                />


                <button
                  className="primary-button"
                  onClick={addMaterial}
                >
                  Add Material
                </button>

              </div>


              {materials.map((material) => (

                <div
                  className="achievement-item"
                  key={material.id}
                >

                  <h3>
                    {material.title}
                  </h3>

                  <p>
                    Course: {material.course}
                  </p>

                  <button
                    onClick={() =>
                      deleteMaterial(
                        material.id
                      )
                    }
                  >
                    Delete
                  </button>

                </div>

              ))}


              {lmsMessage && (

                <p className="section-description">
                  {lmsMessage}
                </p>

              )}

            </div>

          </section>

        )}


        {/* ================================================= */}
        {/* AI ASSIGNMENT EVALUATOR */}
        {/* ================================================= */}

        {activeSection === 'AI Assignment Evaluator' && (
          <section className="teacher-content">

            <div className="teacher-card">

              <div className="card-heading">
                <div>
                  <h2>AI Assignment Evaluator</h2>
                  <p className="section-description">
                    Evaluate student assignments with AI-powered scoring,
                    feedback and improvement suggestions.
                  </p>
                </div>
              </div>

              <div className="teacher-form">

                <label>
                  Assignment / Question
                </label>

                <textarea
                  rows={5}
                  placeholder="Enter the assignment question or evaluation criteria..."
                  value={evaluationAssignment}
                  onChange={(e) =>
                    setEvaluationAssignment(e.target.value)
                  }
                />

                <label>
                  Student Answer
                </label>

                <textarea
                  rows={8}
                  placeholder="Paste the student's answer here..."
                  value={studentAnswer}
                  onChange={(e) =>
                    setStudentAnswer(e.target.value)
                  }
                />

                <button
                  className="primary-button"
                  onClick={evaluateAssignment}
                  disabled={
                    !evaluationAssignment.trim() ||
                    !studentAnswer.trim()
                  }
                >
                  Evaluate with AI
                </button>

              </div>

              {evaluationResult && (
                <div className="ai-evaluation-result">

                  <div className="ai-evaluation-header">
                    <div>
                      <span className="stat-label">
                        AI EVALUATION
                      </span>
                      <h3>Evaluation Complete</h3>
                    </div>

                    <div className="ai-score">
                      <span>Score</span>
                      <strong>
                        {evaluationResult.score}/10
                      </strong>
                    </div>
                  </div>

                  <div className="ai-feedback-box">
                    <h3>AI Feedback</h3>
                    <p>
                      {evaluationResult.feedback}
                    </p>
                  </div>

                  <div className="ai-evaluation-grid">

                    <div className="ai-evaluation-box">
                      <h3>Strengths</h3>

                      {evaluationResult.strengths.map(
                        (strength, index) => (
                          <div
                            className="ai-evaluation-item"
                            key={index}
                          >
                            <span>✓</span>
                            <p>{strength}</p>
                          </div>
                        )
                      )}
                    </div>

                    <div className="ai-evaluation-box">
                      <h3>Areas for Improvement</h3>

                      {evaluationResult.improvements.map(
                        (improvement, index) => (
                          <div
                            className="ai-evaluation-item"
                            key={index}
                          >
                            <span>→</span>
                            <p>{improvement}</p>
                          </div>
                        )
                      )}
                    </div>

                  </div>

                </div>
              )}

            </div>

          </section>
        )}



        {/* ================================================= */}
        {/* ATTENDANCE ALERT */}
        {/* ================================================= */}

        {activeSection === 'Attendance Alert' && (
          <section className="teacher-content">

            <div className="teacher-card">

              <div className="card-heading">
                <div>
                  <h2>Attendance Alert</h2>
                  <p className="section-description">
                    Check student attendance and generate alerts for students
                    who fall below the required attendance percentage.
                  </p>
                </div>
              </div>

              <div className="teacher-form">

                <label>
                  Student Name
                </label>

                <input
                  type="text"
                  placeholder="Enter student name..."
                  value={attendanceStudent}
                  onChange={(e) =>
                    setAttendanceStudent(e.target.value)
                  }
                />

                <label>
                  Attendance Percentage
                </label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Example: 68"
                  value={attendancePercentage}
                  onChange={(e) =>
                    setAttendancePercentage(e.target.value)
                  }
                />

                <label>
                  Minimum Required Attendance (%)
                </label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  value={attendanceThreshold}
                  onChange={(e) =>
                    setAttendanceThreshold(e.target.value)
                  }
                />

                <button
                  className="primary-button"
                  onClick={checkAttendance}
                  disabled={
                    !attendanceStudent.trim() ||
                    !attendancePercentage.trim()
                  }
                >
                  Check Attendance
                </button>

              </div>

              {attendanceResult && (
                <div className="attendance-alert-result">

                  <div className="attendance-result-header">
                    <div>
                      <span className="stat-label">
                        ATTENDANCE CHECK
                      </span>
                      <h3>
                        {attendanceResult.status === 'safe'
                          ? 'Attendance Requirement Met'
                          : 'Attendance Warning Required'}
                      </h3>
                    </div>

                    <div
                      className={`attendance-status ${attendanceResult.status}`}
                    >
                      {attendanceResult.status === 'safe'
                        ? 'SAFE'
                        : 'ALERT'}
                    </div>
                  </div>

                  <div className="attendance-metrics">
                    <div className="attendance-metric">
                      <span>Student</span>
                      <strong>{attendanceStudent}</strong>
                    </div>

                    <div className="attendance-metric">
                      <span>Attendance</span>
                      <strong>{attendanceResult.percentage}%</strong>
                    </div>

                    <div className="attendance-metric">
                      <span>Required</span>
                      <strong>{attendanceResult.threshold}%</strong>
                    </div>
                  </div>

                  <div className="attendance-message-box">
                    <h3>AI Attendance Insight</h3>
                    <p>{attendanceResult.message}</p>
                  </div>

                  {attendanceResult.status === 'warning' && (
                    <div className="attendance-warning-box">
                      <h3>Suggested Warning</h3>
                      <p>
                        Dear {attendanceStudent}, your current attendance is{' '}
                        {attendanceResult.percentage}%, which is below the
                        required {attendanceResult.threshold}%. Please improve
                        your attendance and contact the faculty if you have
                        any valid reason for the shortage.
                      </p>
                    </div>
                  )}

                </div>
              )}

            </div>

          </section>
        )}

        {/* ================================================= */}
        {/* ASSIGNMENT REMINDER */}
        {/* ================================================= */}

        {activeSection === 'Assignment Reminder' && (
          <section className="teacher-content">

            <div className="teacher-card">

              <div className="card-heading">
                <div>
                  <h2>Assignment Reminder</h2>
                  <p className="section-description">
                    Create and manage reminders for upcoming assignments so
                    students stay aware of important deadlines.
                  </p>
                </div>
              </div>

              <div className="teacher-form">

                <label>Assignment Title</label>
                <input
                  type="text"
                  placeholder="Example: CNN Classification Assignment"
                  value={reminderForm.title}
                  onChange={(e) =>
                    setReminderForm({
                      ...reminderForm,
                      title: e.target.value,
                    })
                  }
                />

                <label>Subject</label>
                <input
                  type="text"
                  placeholder="Example: Artificial Intelligence"
                  value={reminderForm.subject}
                  onChange={(e) =>
                    setReminderForm({
                      ...reminderForm,
                      subject: e.target.value,
                    })
                  }
                />

                <label>Due Date</label>
                <input
                  type="date"
                  value={reminderForm.dueDate}
                  onChange={(e) =>
                    setReminderForm({
                      ...reminderForm,
                      dueDate: e.target.value,
                    })
                  }
                />

                <label>Reminder Message</label>
                <textarea
                  rows={5}
                  placeholder="Enter the message students should receive..."
                  value={reminderForm.message}
                  onChange={(e) =>
                    setReminderForm({
                      ...reminderForm,
                      message: e.target.value,
                    })
                  }
                />

                <button
                  className="primary-button"
                  onClick={createAssignmentReminder}
                  disabled={
                    !reminderForm.title.trim() ||
                    !reminderForm.subject.trim() ||
                    !reminderForm.dueDate
                  }
                >
                  Create Reminder
                </button>

              </div>

              <div className="assignment-reminders-list">
                <div className="card-heading">
                  <div>
                    <h2>Scheduled Reminders</h2>
                    <p className="section-description">
                      Reminders created during this session.
                    </p>
                  </div>
                </div>

                {assignmentReminders.length === 0 ? (
                  <div className="assignment-reminder-empty">
                    No reminders created yet.
                  </div>
                ) : (
                  assignmentReminders.map((reminder) => (
                    <div
                      className="assignment-reminder-card"
                      key={reminder.id}
                    >
                      <div className="assignment-reminder-info">
                        <div>
                          <span className="stat-label">UPCOMING ASSIGNMENT</span>
                          <h3>{reminder.title}</h3>
                          <p>{reminder.subject}</p>
                        </div>

                        <div className="assignment-reminder-date">
                          <span>Due Date</span>
                          <strong>{reminder.dueDate}</strong>
                        </div>
                      </div>

                      <div className="assignment-reminder-message">
                        <span>Reminder Message</span>
                        <p>
                          {reminder.message ||
                            `Reminder: ${reminder.title} is due on ${reminder.dueDate}.`}
                        </p>
                      </div>

                      <div className="assignment-reminder-footer">
                        <span className="reminder-status">Scheduled</span>
                        <button
                          className="secondary-button"
                          onClick={() => deleteAssignmentReminder(reminder.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>

          </section>
        )}


        {/* ================================================= */}
        {/* AI ASSISTANT */}
        {/* ================================================= */}

        {activeSection ===
          'AI Assistant' && (

          <section className="teacher-content">

            <div className="teacher-card">

              <h2>
                AI Assistant
              </h2>

              <p className="section-description">
                AI-powered tools for organizing and
                understanding achievement data.
              </p>


              <div className="quick-actions">

                <button
                  onClick={
                    organizeAchievements
                  }
                >
                  Organize Achievements
                </button>


                <button
                  onClick={
                    classifyStudentAchievements
                  }
                >
                  Classify Student Achievements
                </button>


                <button
                  onClick={
                    generateAchievementSummary
                  }
                >
                  Generate Achievement Summary
                </button></div>


              {aiResult && (

                <div className="achievement-item">

                  <h3>
                    AI Result
                  </h3>

                  <p
                    style={{
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {aiResult}
                  </p>

                </div>

              )}


              {!aiResult && (

                <div className="achievement-item">

                  <h3>
                    AI Assistant Ready
                  </h3>

                  <p>
                    Select an AI action above to
                    analyze your achievement data.
                  </p>

                </div>

              )}

            </div>

          </section>

        )}


        {/* ================================================= */}
        {/* SETTINGS */}
        {/* ================================================= */}

        {activeSection === 'Settings' && (

          <section className="teacher-content">

            <div className="teacher-card">

              <h2>
                Settings
              </h2>

              <p className="section-description">
                Manage your dashboard preferences.
              </p>


              <div className="teacher-form">

                <label>
                  Account Email
                </label>

                <input
                  type="email"
                  value={profile.email}
                  placeholder="Enter account email"
                  onChange={(e) =>
                    handleProfileChange(
                      'email',
                      e.target.value
                    )
                  }
                />


                <label>
                  Notification Preference
                </label>

                <select
                  value={
                    notificationPreference
                  }
                  onChange={(e) => {
                    setNotificationPreference(
                      e.target.value
                    )

                    setSettingsSaved(false)
                  }}
                >

                  <option value="all">
                    All Notifications
                  </option>

                  <option value="important">
                    Important Only
                  </option>

                  <option value="none">
                    Disable Notifications
                  </option>

                </select>


                <button
                  className="primary-button"
                  onClick={saveSettings}
                >
                  Save Settings
                </button>


                {settingsSaved && (

                  <p className="section-description">
                    Settings saved successfully.
                  </p>

                )}

              </div>


              <div className="quick-actions">

                <button onClick={onLogout}>
                  Sign Out
                </button>

              </div>

            </div>

          </section>

        )}

      </main>

    </div>
  )
}

export default TeacherDashboard