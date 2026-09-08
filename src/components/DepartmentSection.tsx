import './DepartmentSection.css'

function DepartmentSection() {
  return (
    <section className="department-section">
      <div className="department-section-header">
        <div>
          <span className="section-label">01 · DEPARTMENT</span>

          <h2>Computer Science & Engineering</h2>

         
        </div>
      </div>

      <div className="department-info-grid">

        {/* About Department */}
        <div className="department-info-card">
          <span className="department-card-number">01</span>

          <h3>About the Department</h3>

          <p>
            The Department of Computer Science and Engineering at Sanjivani University is committed to excellence in education and research in full stack development with focus on domains such as Computer Vision, Machine Learning, Digital Twins etc.
          </p>
        </div>

        {/* Academic Programs */}
        <div className="department-info-card">
          <span className="department-card-number">02</span>

          <h3>Mission</h3>

          <p>
            To provide the platform to become industry ready technocrats as a full stack developer and a curriculum tailored to industry needs, with a focus on complex problem-solving skills.
To impart high quality Experiential learning in modern software tools and to cater to the real time requirements of the industry.
To develop quality research with both national and international to enhance learning and research through research ecosystem.

          </p>
        </div>

        {/* Department Facilities */}
        <div className="department-info-card">
          <span className="department-card-number">03</span>

          <h3>Vision</h3>

          <p>
            To achieve global recognition in the field of computer science and engineering department through innovative curriculum and quality in Education, Research, Innovation and Entrepreneurship to produce effective leaders for serving the societal challenges.
          </p>
        </div>

        {/* Learning Opportunities */}
        <div className="department-info-card">
          <span className="department-card-number">04</span>

          <h3>Program outcomes</h3>

          <p>
           PO1: Engineering Knowledge
PO2: Problem Analysis
PO3: Design/Development of Solutions
PO4: Conduct investigations of complex problems
PO5: Modern tool usage
PO6: The engineer and society
PO7: Environment and sustainability
PO8: Ethics
PO9: Individual and team work
PO10: Communication
PO11: Project management and finance
PO12: Life-long learning
          </p>
        </div>

      </div>
    </section>
  )
}

export default DepartmentSection