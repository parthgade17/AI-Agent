// import LandingPage from './components/LandingPage'

// function App() {
//   return <LandingPage />
// }

// export default App

import TeacherDashboard from './components/TeacherDashboard'

function App() {
  return (
    <TeacherDashboard
      name="Demo Teacher"
      onLogout={() => console.log('Logout clicked')}
    />
  )
}

export default App