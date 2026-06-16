import { useState, useEffect } from 'react';
import { Card, Row, Col, DatePicker, Button } from 'antd';
import { BarChartOutlined, WalletOutlined, BookOutlined, UserOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';
import { homeApi } from '../api';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

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
    <div>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <DatePicker.RangePicker
          value={dateRange}
          onChange={handleDateChange}
          format="YYYY-MM-DD"
          allowClear={false}
          style={{ width: 320 }}
        />
        <Button onClick={fetchSummary}>刷新数据</Button>
      </div>

      <Row gutter={16}>
        <Col span={6}>
          <Card
            hoverable
            onClick={() => handleCardClick('/cashflow')}
            style={{ cursor: 'pointer' }}
            title="总收款金额"
            extra={<BarChartOutlined />}
          >
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
              ¥{(summary.totalReceipt || 0).toLocaleString()}
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card
            hoverable
            onClick={() => handleCardClick('/cashflow')}
            style={{ cursor: 'pointer' }}
            title="实际收入金额"
            extra={<WalletOutlined />}
          >
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
              ¥{(summary.totalCashflow || 0).toLocaleString()}
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card
            hoverable
            onClick={() => handleCardClick('/salary')}
            style={{ cursor: 'pointer' }}
            title="总工资支出"
            extra={<WalletOutlined />}
          >
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f5222d' }}>
              ¥{(summary.totalSalary || 0).toLocaleString()}
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card
            hoverable
            onClick={() => handleCardClick('/script', { scriptName: (summary.topScript || {}).name })}
            style={{ cursor: 'pointer' }}
            title="最热门剧本"
            extra={<BookOutlined />}
          >
            <div style={{ fontSize: 16 }}>{(summary.topScript || {}).name || '无'}</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
              {((summary.topScript || {}).count || 0)} 场
            </div>
          </Card>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={6}>
          <Card
            hoverable
            onClick={() => handleCardClick('/dm', { name: (summary.topDm || {}).name })}
            style={{ cursor: 'pointer' }}
            title="最活跃DM"
            extra={<UserOutlined />}
          >
            <div style={{ fontSize: 16 }}>{(summary.topDm || {}).name || '无'}</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>
              {((summary.topDm || {}).count || 0)} 场
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card
            hoverable
            onClick={() => handleCardClick('/session')}
            style={{ cursor: 'pointer' }}
            title="开本次数"
            extra={<BarChartOutlined />}
          >
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>
              {(summary.totalSessions || 0)} 场
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="数据趋势">
            <div id="trendChart" style={{ height: 350 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Home;
