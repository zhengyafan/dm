import { useState, useEffect } from 'react';
import { Card, Row, Col, DatePicker, Button, Space } from 'antd';
import { BarChartOutlined, WalletOutlined, BookOutlined, UserOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';
import { homeApi } from '../api';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { formatMoney, MetricCard, PageShell, Toolbar } from '../components/ui';

function Home() {
  const [summary, setSummary] = useState({
    totalCashflow: 0,
    totalReceipt: 0,
    totalSalary: 0,
    topScript: { name: '无', count: 0 },
    topDm: { name: '无', count: 0 },
    totalSessions: 0
  });
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()]);
  const [trendData, setTrendData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSummary();
    fetchTrend();
  }, [dateRange]);

  const fetchSummary = async () => {
    try {
      const response = await homeApi.summary({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD')
      });
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  const fetchTrend = async () => {
    try {
      const response = await homeApi.trend({ year: dayjs().year() });
      setTrendData(response.data);
    } catch (error) {
      console.error('Failed to fetch trend:', error);
    }
  };

  useEffect(() => {
    const chartDom = document.getElementById('trendChart');
    if (chartDom && trendData.length > 0) {
      const chart = echarts.init(chartDom);
      const option = {
        title: { text: '月度流水趋势', left: 'center' },
        tooltip: { trigger: 'axis' },
        legend: { data: ['总收款金额', '实际收入金额', '开本次数'], bottom: 10 },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: {
          type: 'category',
          data: trendData.map(d => `${d.month}月`)
        },
        yAxis: [
          { type: 'value', name: '金额(元)', position: 'left' },
          { type: 'value', name: '次数', position: 'right' }
        ],
        series: [
          {
            name: '总收款金额',
            type: 'bar',
            data: trendData.map(d => Math.round(d.totalReceipt || 0))
          },
          {
            name: '实际收入金额',
            type: 'line',
            data: trendData.map(d => Math.round(d.actualIncome || 0))
          },
          {
            name: '开本次数',
            type: 'line',
            yAxisIndex: 1,
            data: trendData.map(d => d.sessions)
          }
        ]
      };
      chart.setOption(option);
      return () => chart.dispose();
    }
  }, [trendData]);

  const handleDateChange = (dates) => {
    if (dates) {
      setDateRange(dates);
    }
  };

  const handleCardClick = (path, extraParams = {}) => {
    navigate(path, { state: extraParams });
  };

  return (
    <PageShell
      title="经营总览"
      description="按日期范围查看收入、工资、场次和经营趋势。"
      extra={<Space>{dateRange[0].format('YYYY-MM-DD')} 至 {dateRange[1].format('YYYY-MM-DD')}</Space>}
    >
      <Toolbar
        filters={(
          <DatePicker.RangePicker
            value={dateRange}
            onChange={handleDateChange}
            format="YYYY-MM-DD"
            allowClear={false}
            style={{ width: 320 }}
          />
        )}
        actions={<Button onClick={fetchSummary}>刷新数据</Button>}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            label="总收款金额"
            value={formatMoney(summary.totalReceipt)}
            icon={<BarChartOutlined />}
            tone="forest"
            onClick={() => handleCardClick('/cashflow')}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            label="实际收入金额"
            value={formatMoney(summary.totalCashflow)}
            icon={<WalletOutlined />}
            tone="teal"
            onClick={() => handleCardClick('/cashflow')}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            label="总工资支出"
            value={formatMoney(summary.totalSalary)}
            icon={<WalletOutlined />}
            tone="red"
            onClick={() => handleCardClick('/salary')}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            label="开本次数"
            value={summary.totalSessions || 0}
            suffix=" 场"
            icon={<BarChartOutlined />}
            tone="amber"
            onClick={() => handleCardClick('/session')}
          />
        </Col>
      </Row>

      <div className="dashboard-insight-grid" style={{ marginTop: 16 }}>
        <div className="insight-card" onClick={() => handleCardClick('/script', { scriptName: (summary.topScript || {}).name })}>
          <div className="insight-label"><BookOutlined /> 最热门剧本</div>
          <div className="insight-value">{(summary.topScript || {}).name || '无'} · {((summary.topScript || {}).count || 0)} 场</div>
        </div>
        <div className="insight-card" onClick={() => handleCardClick('/dm', { name: (summary.topDm || {}).name })}>
          <div className="insight-label"><UserOutlined /> 最活跃 DM</div>
          <div className="insight-value">{(summary.topDm || {}).name || '无'} · {((summary.topDm || {}).count || 0)} 场</div>
        </div>
        <div className="insight-card" onClick={() => handleCardClick('/cashflow')}>
          <div className="insight-label"><WalletOutlined /> 收入效率</div>
          <div className="insight-value">{formatMoney((summary.totalCashflow || 0) - (summary.totalSalary || 0))}</div>
        </div>
      </div>

      <Card className="app-card" title="月度流水趋势" style={{ marginTop: 16 }}>
        <div id="trendChart" style={{ height: 360 }} />
      </Card>
    </PageShell>
  );
}

export default Home;
