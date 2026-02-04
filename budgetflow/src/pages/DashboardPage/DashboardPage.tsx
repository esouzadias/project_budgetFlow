import './DashboardPage.style.less'
import Navbar from '../../components/NavBar/Navbar'
import OverviewGraph from '../../components/OverviewGraph/OverviewGraph'
import EarningsAndExpenses from '../EarningsAndExpenses/EarningsAndExpenses'
import Savings from '../../pages/Savings/Savings'

type Props = {}

function DashboardPage({ }: Props) {
  return (
    <main id='dashboard-page'>
      <span id='navbar'><Navbar /></span>
      <div id='dashboard-page-container'>
        <div id='dashboard-overview-graph'>
          <OverviewGraph />
        </div>
        <EarningsAndExpenses />
        <Savings />
      </div>
    </main>
  )
}

export default DashboardPage