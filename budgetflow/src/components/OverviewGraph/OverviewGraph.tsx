import "./OverviewGraph.style.less";
import { PieChart } from '@mui/x-charts/PieChart';
import Box from '@mui/material/Box';
import { BarChart } from '@mui/x-charts/BarChart';


//Pie Chart Active Arc Example
const data = [
  { label: 'Windows', value: 70 },
  { label: 'macOS', value: 20 },
  { label: 'Linux', value: 10 },
];
const valueFormatter: any = (value: number) => `${value}%`;

//Bar Chart Example
const uData = [4000, 3000, 2000, 2780, 1890, 2390, 3490];
const pData = [2400, 1398, 9800, 3908, 4800, 3800, 4300];
const xLabels = [
  'Page A',
  'Page B',
  'Page C',
  'Page D',
  'Page E',
  'Page F',
  'Page G',
];

const OverviewGraph = () => {
  return (
    <main id='overview-graph'>
      <div id='overview-graph-container'>
        <Box sx={{ width: '50%', height: 300 }}>
          <BarChart
            series={[
              { data: pData, label: 'pv', id: 'pvId' },
              { data: uData, label: 'uv', id: 'uvId' },
            ]}
            xAxis={[{ data: xLabels, height: 28 }]}
            yAxis={[{ width: 50 }]}
          />
        </Box>
        <PieChart
          series={[
            {
              data: data,
              highlightScope: { fade: 'global', highlight: 'item' },
              faded: { innerRadius: 30, additionalRadius: -30, color: 'gray' },
              valueFormatter,
            },
          ]}
          height={300}
          width={300}
        />
      </div>
    </main>
  );
}
export default OverviewGraph;
