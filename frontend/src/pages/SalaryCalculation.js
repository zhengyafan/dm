import { useState, useEffect } from 'react';
import { Table, Button, DatePicker, InputNumber, Input, message, Card, Collapse, Tabs, Popconfirm, Upload } from 'antd';
import { CalculatorOutlined, SaveOutlined, UndoOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { salaryApi } from '../api';
import dayjs from 'dayjs';
import { MoneyText, PageShell, tablePagination, Toolbar, TypeTag } from '../components/ui';

const { RangePicker } = DatePicker;

function SalaryCalculation() {
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()]);
  const [results, setResults] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchDmName, setSearchDmName] = useState('');
  const [searchDateRange, setSearchDateRange] = useState([]);
  const [filterDmName, setFilterDmName] = useState('');
  const resultTotal = results.reduce((sum, item) => sum + (Number(item.total_salary) || 0), 0);
  const resultCars = results.reduce((sum, item) => sum + (Number(item.total_cars) || 0), 0);

  const calculate = async () => {
    setLoading(true);
    try {
      const response = await salaryApi.calculate({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        dmName: filterDmName
      });
      setResults(response.data);
      setShowResults(true);
    } catch (error) {
      message.error('计算失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (dmId, field, value) => {
    setResults(prev => prev.map(item => {
      if (item.dm_id === dmId) {
        const newItem = { ...item, [field]: parseFloat(value) || 0 };
        newItem.total_salary = newItem.base_salary + newItem.bonus_salary +
                              newItem.city_extra + newItem.props_total + newItem.milestone_reward + (newItem.blood_salary || 0);
        return newItem;
      }
      return item;
    }));
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  const fetchSettlements = async () => {
    try {
      const params = {};
      if (searchDmName) {
        params.dm_name = searchDmName;
      }
      if (searchDateRange && searchDateRange.length === 2) {
        params.start_date = searchDateRange[0].format('YYYY-MM-DD');
        params.end_date = searchDateRange[1].format('YYYY-MM-DD');
      }
      const response = await salaryApi.settlements(params);
      setSettlements(response.data);
    } catch (error) {
      console.error('获取结算记录失败:', error);
    }
  };

  const handleSearch = () => {
    fetchSettlements();
  };

  const handleReset = () => {
    setSearchDmName('');
    setSearchDateRange([]);
    fetchSettlements();
  };

  const handleCancelSettlement = async (id) => {
    try {
      await salaryApi.cancelSettlement(id);
      message.success('取消结算成功');
      fetchSettlements();
    } catch (error) {
      message.error('取消结算失败');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await salaryApi.downloadTemplate();
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'salary_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('模板下载成功');
    } catch (error) {
      message.error('模板下载失败');
    }
  };

  const handleExport = async () => {
    try {
      const response = await salaryApi.export();
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${String(now.getMilliseconds()).padStart(3, '0')}`;
      link.download = `工资结算${timestamp}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  const handleImport = async (file) => {
    try {
      const response = await salaryApi.import(file);
      message.success(`导入成功：新增 ${response.data.added} 条，跳过 ${response.data.skipped} 条`);
      if (response.data.errors && response.data.errors.length > 0) {
        console.warn('导入警告:', response.data.errors);
      }
      fetchSettlements();
    } catch (error) {
      message.error('导入失败');
    }
    return false;
  };

  const handleSettle = async () => {
    if (results.length === 0) {
      message.warning('没有可结算的数据');
      return;
    }
    
    try {
      await salaryApi.settle({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        items: results
      });
      message.success('结算成功');
      setResults([]);
      setShowResults(false);
      fetchSettlements();
    } catch (error) {
      message.error('结算失败');
    }
  };

  const columns = [
    { title: 'DM姓名', dataIndex: 'dm_name', key: 'dm_name' },
    { title: 'DM类型', dataIndex: 'dm_type', key: 'dm_type', render: (text) => <TypeTag value={text} /> },
    { title: '普通车次', dataIndex: 'normal_cars', key: 'normal_cars' },
    { title: '城限车次', dataIndex: 'city_cars', key: 'city_cars' },
    { title: '血染车次', dataIndex: 'blood_cars', key: 'blood_cars' },
    { title: '总车次', dataIndex: 'total_cars', key: 'total_cars' },
    { 
      title: '基本工资', 
      dataIndex: 'base_salary', 
      key: 'base_salary',
      render: (text, record) => (
        <InputNumber
          value={text}
          onChange={(value) => handleFieldChange(record.dm_id, 'base_salary', value)}
          style={{ width: 100 }}
        />
      )
    },
    { 
      title: '好评工资', 
      dataIndex: 'bonus_salary', 
      key: 'bonus_salary',
      render: (text, record) => (
        <InputNumber
          value={text}
          onChange={(value) => handleFieldChange(record.dm_id, 'bonus_salary', value)}
          style={{ width: 100 }}
        />
      )
    },
    { 
      title: '城限提成', 
      dataIndex: 'city_extra', 
      key: 'city_extra',
      render: (text, record) => (
        <InputNumber
          value={text}
          onChange={(value) => handleFieldChange(record.dm_id, 'city_extra', value)}
          style={{ width: 100 }}
        />
      )
    },
    { 
      title: '血染工资', 
      dataIndex: 'blood_salary', 
      key: 'blood_salary',
      render: (text, record) => (
        <InputNumber
          value={text}
          onChange={(value) => handleFieldChange(record.dm_id, 'blood_salary', value)}
          style={{ width: 100 }}
        />
      )
    },
    { 
      title: '开本费总计', 
      dataIndex: 'props_total', 
      key: 'props_total',
      render: (text, record) => (
        <InputNumber
          value={text}
          onChange={(value) => handleFieldChange(record.dm_id, 'props_total', value)}
          style={{ width: 100 }}
        />
      )
    },
    { 
      title: '里程碑奖励', 
      dataIndex: 'milestone_reward', 
      key: 'milestone_reward',
      render: (text, record) => (
        <InputNumber
          value={text}
          onChange={(value) => handleFieldChange(record.dm_id, 'milestone_reward', value)}
          style={{ width: 100 }}
        />
      )
    },
    { 
      title: '总工资', 
      dataIndex: 'total_salary', 
      key: 'total_salary',
      render: (text) => <MoneyText value={text} strong tone="teal" />
    },
    { 
      title: '备注', 
      dataIndex: 'remark', 
      key: 'remark',
      render: (text, record) => (
        <Input
          value={text}
          onChange={(e) => handleFieldChange(record.dm_id, 'remark', e.target.value)}
          style={{ width: 120 }}
        />
      )
    }
  ];

  return (
    <PageShell title="工资计算" description="按周期计算未结算开本工资，可人工调整后保存结算。">
      <Toolbar
        filters={(
          <>
          <RangePicker
            value={dateRange}
            onChange={(dates) => dates && setDateRange(dates)}
            format="YYYY-MM-DD"
            allowClear={false}
            style={{ width: 320 }}
          />
          <Input
            placeholder="DM姓名（模糊查询）"
            value={filterDmName}
            onChange={(e) => setFilterDmName(e.target.value)}
            style={{ width: 200 }}
          />
          </>
        )}
        actions={(
          <>
          <Button
            type="primary"
            icon={<CalculatorOutlined />}
            onClick={calculate}
            loading={loading}
          >
            查询计算
          </Button>
          <Button 
            onClick={() => {
              setDateRange([dayjs().startOf('month'), dayjs()]);
              setFilterDmName('');
              setShowResults(false);
            }}
          >
            重置
          </Button>
          {showResults && results.length > 0 && (
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={handleSettle}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              保存结算
            </Button>
          )}
          </>
        )}
      />

      {showResults && (
        <div className="salary-total-bar">
          <span className="salary-total-pill">本次 DM：{results.length} 人</span>
          <span className="salary-total-pill">本次车次：{resultCars} 场</span>
          <span className="salary-total-pill">预计工资：<MoneyText value={resultTotal} strong tone="teal" /></span>
        </div>
      )}

      <Tabs
        defaultActiveKey="1" 
        style={{ marginTop: 16 }}
        items={[
          {
            key: '1',
            label: '工资计算',
            children: showResults ? (
              <Card title="工资计算结果">
                {results.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <p>该时间段内没有未结算的开本记录</p>
                  </div>
                ) : (
                  <>
                    <Table
                      className="app-table"
                      dataSource={results}
                      columns={columns}
                      rowKey="dm_id"
                      pagination={false}
                      size="small"
                      scroll={{ x: 1420 }}
                    />
                    <Collapse 
                      style={{ marginTop: 20 }}
                      items={results.map(item => ({
                        key: item.dm_id,
                        label: `${item.dm_name} - 开本明细${item.dm_type !== 'parttime' && item.ladder_details?.length > 0 ? '（含阶梯计算）' : ''}`,
                        children: (
                          <div>
                            {item.dm_type !== 'parttime' && item.ladder_details?.length > 0 && (
                              <div style={{ marginBottom: 20 }}>
                                <h4 style={{ marginBottom: 10, color: '#1890ff' }}>阶梯工资计算详情</h4>
                                <Table
                                  className="app-table"
                                  dataSource={item.ladder_details}
                                  columns={[
                                    { title: '累计车次', dataIndex: 'car_index', key: 'car_index' },
                                    { title: '阶梯等级', dataIndex: 'ladder_level', key: 'ladder_level' },
                                    { title: '单场工资(元)', dataIndex: 'salary', key: 'salary' }
                                  ]}
                                  rowKey="car_index"
                                  pagination={false}
                                  size="small"
                                />
                                <div style={{ marginTop: 10, padding: 10, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                                  <p>历史已结算车次: <strong>{item.total_before}</strong> 车</p>
                                  <p>本次计入阶梯车次: <strong>{item.ladder_cars}</strong> 车</p>
                                  <p>阶梯工资合计: <strong style={{ color: '#1890ff' }}>¥{item.base_salary}</strong></p>
                                </div>
                              </div>
                            )}
                            <Table
                              className="app-table"
                              dataSource={item.sessions}
                              columns={[
                                { title: '剧本名称', dataIndex: 'script_name', key: 'script_name' },
                                { title: '开本日期', dataIndex: 'session_date', key: 'session_date' },
                                { title: '开本时间', dataIndex: 'session_time', key: 'session_time' },
                                { title: '属性', dataIndex: 'attribute', key: 'attribute', render: (t) => <TypeTag value={t} /> },
                                { title: '开本费', dataIndex: 'props_fee', key: 'props_fee', render: (v) => <MoneyText value={v} /> }
                              ]}
                              rowKey="id"
                              pagination={false}
                            />
                          </div>
                        )
                      }))}
                    />
                  </>
                )}
              </Card>
            ) : (
              <Card>
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <p>请选择日期范围并点击"计算工资"按钮</p>
                </div>
              </Card>
            )
          },
          {
            key: '2',
            label: '已结算记录',
            children: (
              <Card
                title="已结算工资记录"
                extra={
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>下载模板</Button>
                    <Upload
                      accept=".xlsx,.xls"
                      showUploadList={false}
                      beforeUpload={handleImport}
                    >
                      <Button icon={<UploadOutlined />}>导入Excel</Button>
                    </Upload>
                    <Button icon={<DownloadOutlined />} onClick={handleExport}>导出Excel</Button>
                  </div>
                }
              >
                <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                  <Input
                    placeholder="DM姓名"
                    value={searchDmName}
                    onChange={(e) => setSearchDmName(e.target.value)}
                    style={{ width: 200 }}
                  />
                  <RangePicker
                    placeholder={['开始日期', '结束日期']}
                    value={searchDateRange}
                    onChange={(dates) => setSearchDateRange(dates || [])}
                    format="YYYY-MM-DD"
                    style={{ width: 320 }}
                  />
                  <Button type="primary" onClick={handleSearch}>查询</Button>
                  <Button onClick={handleReset}>重置</Button>
                </div>
                {settlements.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <p>暂无已结算记录</p>
                  </div>
                ) : (
                  <Table
                    className="app-table"
                    dataSource={settlements}
                    columns={[
                      { title: 'DM姓名', dataIndex: 'Dm', key: 'dm_name', render: (dm) => dm?.name || '' },
                      { title: '结算周期', key: 'period', render: (record) => `${record.start_date} ~ ${record.end_date}` },
                      { title: '总车次', dataIndex: 'total_cars', key: 'total_cars' },
                      { title: '基本工资', dataIndex: 'base_salary', key: 'base_salary' },
                      { title: '好评工资', dataIndex: 'bonus_salary', key: 'bonus_salary' },
                      { title: '城限提成', dataIndex: 'city_extra', key: 'city_extra' },
                      { title: '血染工资', dataIndex: 'blood_salary', key: 'blood_salary' },
                      { title: '开本费总计', dataIndex: 'props_total', key: 'props_total' },
                      { title: '里程碑奖励', dataIndex: 'milestone_reward', key: 'milestone_reward' },
                      { title: '总工资', dataIndex: 'total_salary', key: 'total_salary', render: (text) => <MoneyText value={text} strong tone="teal" /> },
                      { title: '备注', dataIndex: 'remark', key: 'remark' },
                      { title: '结算时间', dataIndex: 'createdAt', key: 'createdAt', render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm') },
                      { 
                        title: '操作', 
                        key: 'action', 
                        render: (_, record) => (
                          <Popconfirm
                            title="确定取消结算吗？"
                            description="取消结算后，相关场次将重新计入未结算状态，可以重新计算工资。"
                            onConfirm={() => handleCancelSettlement(record.id)}
                            okText="确定"
                            cancelText="取消"
                          >
                            <Button 
                              type="text" 
                              icon={<UndoOutlined />} 
                              style={{ color: '#f5222d' }}
                            >
                              取消结算
                            </Button>
                          </Popconfirm>
                        )
                      }
                    ]}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1360 }}
                    pagination={tablePagination('结算记录')}
                  />
                )}
              </Card>
            )
          }
        ]}
      />
    </PageShell>
  );
}

export default SalaryCalculation;
