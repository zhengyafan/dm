import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber, DatePicker, message, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { cashflowApi } from '../api';
import dayjs from 'dayjs';
import { MetricCard, MoneyText, PageShell, RecordCount, tablePagination, Toolbar } from '../components/ui';

function CashflowManagement() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchScriptName, setSearchScriptName] = useState('');
  const [searchYear, setSearchYear] = useState('');
  const [searchMonth, setSearchMonth] = useState('');
  const [summary, setSummary] = useState({ totalAmount: '0.00', actualIncome: '0.00', count: 0 });

  const years = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    fetchData();
    fetchSummary();
  }, [searchScriptName, searchYear, searchMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await cashflowApi.list({
        scriptName: searchScriptName || undefined,
        year: searchYear || undefined,
        month: searchMonth || undefined
      });
      setData(response.data);
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await cashflowApi.summary({
        scriptName: searchScriptName || undefined,
        year: searchYear || undefined,
        month: searchMonth || undefined
      });
      setSummary(response.data);
    } catch (error) {
      console.error('获取汇总数据失败', error);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setEditingId(null);
    setVisible(true);
  };

  const handleEdit = (record) => {
    form.setFieldsValue({
      script_name: record.script_name,
      session_date: record.session_date ? dayjs(record.session_date) : null,
      meituan_amount: record.meituan_amount,
      meituan_rate: record.meituan_rate,
      miquan_amount: record.miquan_amount,
      miquan_rate: record.miquan_rate,
      wechat_amount: record.wechat_amount,
      remark: record.remark
    });
    setEditingId(record.id);
    setVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await cashflowApi.delete(id);
      message.success('删除成功');
      fetchData();
      fetchSummary();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRows.length === 0) {
      message.warning('请选择要删除的记录');
      return;
    }
    try {
      await cashflowApi.batchDelete(selectedRows);
      message.success('批量删除成功');
      setSelectedRows([]);
      fetchData();
      fetchSummary();
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const submitData = {
        ...values,
        session_date: values.session_date ? values.session_date.format('YYYY-MM-DD') : null
      };
      if (editingId) {
        await cashflowApi.update(editingId, submitData);
        message.success('更新成功');
      } else {
        await cashflowApi.create(submitData);
        message.success('创建成功');
      }
      setVisible(false);
      fetchData();
      fetchSummary();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleImport = async (file) => {
    try {
      const response = await cashflowApi.import(file);
      if (response.data.errors && response.data.errors.length > 0) {
        message.warning(`导入完成，成功${response.data.added}条，跳过${response.data.skipped}条。错误信息：${response.data.errors[0]}`);
      } else {
        message.success(`导入成功，共导入${response.data.added}条记录`);
      }
      fetchData();
      fetchSummary();
    } catch (error) {
      message.error('导入失败：' + (error.response?.data?.error || error.message));
    }
    return false;
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await cashflowApi.downloadTemplate();
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = '流水记录导入模板.xlsx';
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
      const response = await cashflowApi.export();
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${String(now.getMilliseconds()).padStart(3, '0')}`;
      link.download = `流水管理${timestamp}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      message.error('导出失败');
    }
  };

  const calculateTotal = (record) => {
    return (record.meituan_amount || 0) + (record.miquan_amount || 0) + (record.wechat_amount || 0);
  };

  const calculateActualIncome = (record) => {
    const meituan = (record.meituan_amount || 0) * (record.meituan_rate || 0);
    const miquan = (record.miquan_amount || 0) * (record.miquan_rate || 0);
    const wechat = record.wechat_amount || 0;
    return meituan + miquan + wechat;
  };

  const columns = [
    { title: '剧本名称', dataIndex: 'script_name', key: 'script_name' },
    { title: '开本日期', dataIndex: 'session_date', key: 'session_date', render: (text) => text ? new Date(text).toLocaleDateString('zh-CN') : '' },
    { title: '美团金额', dataIndex: 'meituan_amount', key: 'meituan_amount', render: (text) => <MoneyText value={text} /> },
    { title: '美团抽成', dataIndex: 'meituan_rate', key: 'meituan_rate', render: (text) => `${(text * 100).toFixed(0)}%` },
    { title: '谜圈金额', dataIndex: 'miquan_amount', key: 'miquan_amount', render: (text) => <MoneyText value={text} /> },
    { title: '谜圈抽成', dataIndex: 'miquan_rate', key: 'miquan_rate', render: (text) => `${(text * 100).toFixed(0)}%` },
    { title: '微信金额', dataIndex: 'wechat_amount', key: 'wechat_amount', render: (text) => <MoneyText value={text} /> },
    { title: '总收款', key: 'total', render: (_, record) => <MoneyText value={calculateTotal(record)} strong /> },
    { 
      title: '实际收入', 
      key: 'actual_income', 
      render: (_, record) => (
        <MoneyText value={calculateActualIncome(record)} strong tone="income" />
      )
    },
    { title: '备注', dataIndex: 'remark', key: 'remark' },
    {
      title: '操作',
      key: 'action',
      width: 112,
      fixed: 'right',
      render: (_, record) => (
        <div className="table-actions">
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button size="small" icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)} />
        </div>
      )
    }
  ];

  const rowSelection = {
    onChange: (selectedRowKeys) => {
      setSelectedRows(selectedRowKeys);
    },
    selectedRowKeys: selectedRows
  };

  return (
    <PageShell title="流水管理" description="统计收款渠道、平台抽成和实际收入。">
      <Toolbar
        filters={(
          <>
          <Input.Search
            placeholder="剧本名称"
            value={searchScriptName}
            onChange={(e) => setSearchScriptName(e.target.value)}
            style={{ width: 200 }}
          />
          <Select
            placeholder="年份"
            value={searchYear ? Number(searchYear) : undefined}
            onChange={(value) => setSearchYear(value ? String(value) : '')}
            style={{ width: 100 }}
            allowClear
          >
            {years.map(year => (
              <Select.Option key={year} value={year}>{year}</Select.Option>
            ))}
          </Select>
          <Select
            placeholder="月份"
            value={searchMonth ? Number(searchMonth) : undefined}
            onChange={(value) => setSearchMonth(value ? String(value) : '')}
            style={{ width: 100 }}
            allowClear
          >
            {months.map(month => (
              <Select.Option key={month} value={month}>{month}月</Select.Option>
            ))}
          </Select>
          </>
        )}
        meta={<RecordCount count={data.length} selected={selectedRows.length} />}
        actions={(
          <>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>下载导入模板</Button>
          <Button icon={<UploadOutlined />} onClick={() => document.getElementById('import-btn').click()}>导入Excel</Button>
          <input
            id="import-btn"
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              if (e.target.files[0]) {
                handleImport(e.target.files[0]);
              }
            }}
            style={{ display: 'none' }}
          />
          <Button icon={<DownloadOutlined />} onClick={handleExport}>导出Excel</Button>
          <Button icon={<DeleteOutlined />} danger onClick={handleBatchDelete}>批量删除</Button>
          <Button icon={<PlusOutlined />} type="primary" onClick={handleAdd}>新增</Button>
          </>
        )}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <MetricCard label="总收款金额" value={<MoneyText value={summary.totalAmount} strong />} tone="forest" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard label="实际收入金额" value={<MoneyText value={summary.actualIncome} strong tone="income" />} tone="teal" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard label="记录数量" value={summary.count || 0} suffix=" 条" tone="amber" />
        </Col>
      </Row>

      <Table
        className="app-table"
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        rowSelection={rowSelection}
        size="middle"
        scroll={{ x: 1300 }}
        pagination={tablePagination('流水')}
      />

      <Modal
        title={editingId ? '编辑流水' : '新增流水'}
        open={visible}
        onCancel={() => setVisible(false)}
        onOk={handleSubmit}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="script_name" label="剧本名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="session_date" label="开本日期">
            <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="meituan_amount" label="美团金额" rules={[{ type: 'number' }]}>
            <InputNumber min={0} step={0.01} />
          </Form.Item>
          <Form.Item name="meituan_rate" label="美团抽成" rules={[{ type: 'number' }]}>
            <InputNumber min={0} max={1} step={0.01} />
          </Form.Item>
          <Form.Item name="miquan_amount" label="谜圈金额" rules={[{ type: 'number' }]}>
            <InputNumber min={0} step={0.01} />
          </Form.Item>
          <Form.Item name="miquan_rate" label="谜圈抽成" rules={[{ type: 'number' }]}>
            <InputNumber min={0} max={1} step={0.01} />
          </Form.Item>
          <Form.Item name="wechat_amount" label="微信金额" rules={[{ type: 'number' }]}>
            <InputNumber min={0} step={0.01} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}

export default CashflowManagement;
