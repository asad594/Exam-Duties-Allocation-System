import CrudPage from '../../components/CrudPage'

// Field and column configs are module constants so lookups load only once per page.
const facultyFields = [
  { name: 'name', label: 'Full name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'password', label: 'Password', type: 'password', requiredOnCreate: true, placeholder: 'Required for a new user; leave blank to keep' },
  { name: 'role', label: 'Role', type: 'select', required: true, options: [['Faculty', 'Faculty'], ['Admin', 'Admin']] },
  { name: 'maxDuties', label: 'Maximum duties', type: 'number', required: true },
]
const facultyColumns = [
  { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Role' }, { key: 'maxDuties', label: 'Max duties' },
]

const roomFields = [{ name: 'name', label: 'Room name', type: 'text', required: true }]
const roomColumns = [{ key: 'name', label: 'Name' }]

const courseFields = [
  { name: 'code', label: 'Course code', type: 'text', required: true },
  { name: 'title', label: 'Title', type: 'text', required: true },
]
const courseColumns = [{ key: 'code', label: 'Code' }, { key: 'title', label: 'Title' }]

export const FacultyPage = () =>
  <CrudPage title="Faculty" singular="User" endpoint="/staff" fields={facultyFields} columns={facultyColumns} />

export const RoomsPage = () =>
  <CrudPage title="Rooms" singular="Room" endpoint="/rooms" fields={roomFields} columns={roomColumns} />

export const CoursesPage = () =>
  <CrudPage title="Courses" singular="Course" endpoint="/courses" fields={courseFields} columns={courseColumns} />
