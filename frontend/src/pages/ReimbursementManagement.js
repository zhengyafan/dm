import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, InputNumber, message, Card, Image } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined, PictureOutlined } from '@ant-design/icons';
import { reimbursementApi } from '../api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

function ReimbursementManagement() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchPerson, setSearchPerson] = useState('');
  const [dateRange, setDateRange] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    fetchData();
  }, [searchPerson, dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        person: searchPerson || undefined
      };
      if (dateRange.length === 2) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      const [dataRes, summaryRes] = await Promise.all([
        reimbursementApi.list(params),
        reimbursementApi.summary(params)
      ]);
      setData(dataRes.data);
      setTotalAmount(summaryRes.data.total || 0);
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setScreenshotFile(null);
    setPreviewUrl('');
    setEditingId(null);
    setVisible(true);
  };

  const handleEdit = (record) => {
    form.setFieldsValue({
      reason: record.reason,
      person: record.person,
      reimburse_date: dayjs(record.reimburse_date),
      item: record.item,
      unit_price: record.unit_price,
      quantity: record.quantity
    });
    setScreenshotFile(null);
    setPreviewUrl(record.screenshot_path ? `/uploads/reimbursement/${record.screenshot_path.split('/').pop()}` : '');
    setEditingId(record.id);
    setVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await reimbursementApi.delete(id);
      message.success('删除成功');
      fetchData();
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
      await reimbursementApi.batchDelete(selectedRows);
      message.success('批量删除成功');
      setSelectedRows([]);
      fetchData();
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const submitData = new FormData();
      submitData.append('reason', values.reason);
      submitData.append('person', values.person);
      submitData.append('reimburse_date', values.reimburse_date.format('YYYY-MM-DD'));
      submitData.append('item', values.item);
      submitData.append('unit_price', values.unit_price || 0);
      submitData.append('quantity', values.quantity || 1);
      submitData.append('total_amount', (values.unit_price || 0) * (values.quantity || 1));
      
      if (screenshotFile) {
        submitData.append('screenshot', screenshotFile);
      }
      
      if (editingId) {
        await reimbursementApi.update(editingId, submitData);
        message.success('更新成功');
      } else {
        await reimbursementApi.create(submitData);
        message.success('创建成功');
      }
      setVisible(false);
      setScreenshotFile(null);
      setPreviewUrl('');
      fetchData();
    } catch (error) {
      message.error('操作失败：' + (error.response?.data?.error || error.message));
    }
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setScreenshotFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setScreenshotFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            message.success('截图已粘贴');
            break;
          }
        }
      }
    }
  };

  const handleImport = async (file) => {
    try {
      const response = await reimbursementApi.import(file);
      if (response.data.errors && response.data.errors.length > 0) {
        message.warning(`导入完成，成功${response.data.added}条，跳过${response.data.skipped}条。错误信息：${response.data.errors[0]}`);
      } else {
        message.success(`导入成功，共导入${response.data.added}条记录`);
      }
      fetchData();
    } catch (error) {
      message.error('导入失败：' + (error.response?.data?.error || error.message));
    }
    return false;
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await reimbursementApi.downloadTemplate();
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = '报销记录导入模板.xlsx';
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
      const response = await reimbursementApi.export();
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${String(now.getMilliseconds()).padStart(3, '0')}`;
      link.download = `报销管理${timestamp}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      message.error('导出失败');
    }
  };

  const columns = [
    { title: '报销原因', dataIndex: 'reason', key: 'reason' },
    { title: '报销人', dataIndex: 'person', key: 'person' },
    { title: '报销时间', dataIndex: 'reimburse_date', key: 'reimburse_date' },
    { title: '报销物品', dataIndex: 'item', key: 'item' },
    { title: '单价', dataIndex: 'unit_price', key: 'unit_price', render: (text) => `¥${text}` },
    { title: '数量', dataIndex: 'quantity', key: 'quantity' },
    { title: '报销金额', dataIndex: 'total_amount', key: 'total_amount', render: (text) => `¥${text}` },
    {
      title: '截图',
      key: 'screenshot',
      width: 100,
      render: (_, record) => (
        record.screenshot_path ? (
          <Image
            width={60}
            height={60}
            src={`/uploads/reimbursement/${record.screenshot_path.split('/').pop()}`}
            style={{ objectFit: 'cover', borderRadius: 4 }}
            preview={{ mask: <span>查看</span> }}
          />
        ) : (
          <span style={{ color: '#999' }}>无</span>
        )
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)} />
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates || [])}
            format="YYYY-MM-DD"
            style={{ width: 250 }}
          />
          <Input.Search
            placeholder="报销人"
            value={searchPerson}
            onChange={(e) => setSearchPerson(e.target.value)}
            style={{ width: 150 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
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
        </div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 18, fontWeight: 'bold', color: '#f5222d' }}>
            当前筛选结果总报销金额: ¥{totalAmount.toLocaleString()}
          </span>
        </div>
      </Card>

      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        rowSelection={rowSelection}
      />

      <Modal
        title={editingId ? '编辑报销' : '新增报销'}
        open={visible}
        onCancel={() => setVisible(false)}
        onOk={handleSubmit}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="reason" label="报销原因" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="person" label="报销人" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="reimburse_date" label="报销时间" rules={[{ required: true }]}>
            <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="item" label="报销物品" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="unit_price" label="单价" rules={[{ required: true, type: 'number' }]}>
            <InputNumber min={0} step={0.01} />
          </Form.Item>
          <Form.Item name="quantity" label="数量" rules={[{ required: true, type: 'number' }]}>
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item label="截图信息">
            <div
              onPaste={handlePaste}
              style={{
                border: '1px dashed #d9d9d9',
                borderRadius: 8,
                padding: 20,
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: '#fafafa',
                position: 'relative'
              }}
              onClick={() => document.getElementById('screenshot-input').click()}
            >
              {previewUrl ? (
                <div>
                  <img
                    src={previewUrl}
                    alt="截图预览"
                    style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 4 }}
                  />
                  <div style={{ marginTop: 10, color: '#666' }}>
                    点击可更换截图（支持Ctrl+V粘贴）
                  </div>
                </div>
              ) : (
                <div>
                  <PictureOutlined style={{ fontSize: 32, color: '#999' }} />
                  <div style={{ marginTop: 10, color: '#666' }}>
                    点击选择图片 或 Ctrl+V 粘贴截图
                  </div>
                  <div style={{ marginTop: 5, color: '#999', fontSize: 12 }}>
                    支持 jpg、png、gif 格式
                  </div>
                </div>
              )}
            </div>
            <input
              id="screenshot-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleScreenshotChange}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default ReimbursementManagement;
