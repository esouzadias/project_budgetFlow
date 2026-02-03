import './Navbar.style.less'

type Props = {}

function Navbar({}: Props) {
  return (
    <main id='navbar'>
      <div id='navbar-container'>
        <img src="../../logo_banner.png" alt="logo_banner" />
        <span>Navbar</span>
      </div>
    </main>
  )
}

export default Navbar