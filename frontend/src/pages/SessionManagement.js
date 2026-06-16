import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Select, DatePicker, Input, InputNumber, message, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import { sessionApi, dmApi, scriptApi } from '../api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

function SessionManagement() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchDmId, setSearchDmId] = useState('');
  const [searchScriptName, setSearchScriptName] = useState('');
  const [dateRange, setDateRange] = useState([]);
  const [dms, setDms] = useState([]);
  const [scripts, setScripts] = useState([]);

  useEffect(() => {
    fetchDms();
    fetchScripts();
    fetchData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [searchDmId, searchScriptName, dateRange]);

  const fetchDms = async () => {
    try {
      const response = await dmApi.list();
      setDms(response.data);
    } catch (error) {
      console.error('Failed to fetch dms:', error);
    }
  };

  const fetchScripts = async () => {
    try {
      const response = await scriptApi.list();
      setScripts(response.data);
    } catch (error) {
      console.error('Failed to fetch scripts:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        dmId: searchDmId || undefined,
        scriptName: searchScriptName || undefined
      };
      if (dateRange.length === 2) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      const response = await sessionApi.list(params);
      setData(response.data);
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setEditingId(null);
    setVisible(true);
  };

  const handleEdit = (record) => {
    form.setFieldsValue({
      script_id: record.script_id,
      dm_id: record.dm_id,
      session_date: dayjs(record.session_date),
      session_time: record.session_time,
      props_fee: record.props_fee,
      praise_count: record.praise_count,
      remark: record.remark
    });
    setEditingId(record.id);
    setVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await sessionApi.delete(id);
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
      await sessionApi.batchDelete(selectedRows);
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
      const data = {
        ...values,
        session_date: values.session_date.format('YYYY-MM-DD')
      };
      if (editingId) {
        await sessionApi.update(editingId, data);
        message.success('更新成功');
      } else {
        await sessionApi.create(data);
        message.success('创建成功');
      }
      setVisible(false);
      fetchData();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleImport = async (file) => {
    try {
      message.loading('导入中...', 0);
      const response = await sessionApi.import(file);
      const { added, updated, skipped, errors } = response.data;
      if (added > 0) {
        message.success(`导入成功！新增: ${added}条, 更新: ${updated}条, 跳过: ${skipped}条`);
      } else {
        message.warning(`导入完成，但未新增任何记录。跳过: ${skipped}条`);
      }
      if (errors && errors.length > 0) {
        console.error('导入错误详情:', errors);
        message.error(`存在 ${errors.length} 条错误，请查看控制台`);
        errors.forEach(err => console.error(err));
      }
      fetchData();
    } catch (error) {
      console.error('导入错误:', error);
      message.error('导入失败: ' + (error.response?.data?.error || error.message || '未知错误'));
    } finally {
      message.destroy();
      const input = document.getElementById('import-btn');
      if (input) input.value = '';
    }
    return false;
  };

  const handleExport = async () => {
    try {
      const response = await sessionApi.export();
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${String(now.getMilliseconds()).padStart(3, '0')}`;
      link.download = `开本记录${timestamp}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      message.error('导出失败');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await sessionApi.downloadTemplate();
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'session_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      message.error('下载模板失败');
    }
  };

  const columns = [
    { title: '剧本名称', dataIndex: 'Script', key: 'script_name', render: (script) => script?.name || '' },
    { title: '开本日期', dataIndex: 'session_date', key: 'session_date' },
    { title: '开本时间', dataIndex: 'session_time', key: 'session_time' },
    {
      title: '剧本属性',
      dataIndex: 'attribute',
      key: 'attribute',
      render: (text) => (text === 'box' ? '盒装' : '城限')
    },
    { title: '开本费', dataIndex: 'props_fee', key: 'props_fee', render: (text) => `¥${text}` },
    { title: '好评数量', dataIndex: 'praise_count', key: 'praise_count' },
    { title: 'DM姓名', dataIndex: 'Dm', key: 'dm_name', render: (dm) => dm?.name || '' },
    { title: '备注', dataIndex: 'remark', key: 'remark' },
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

  const getScriptAttribute = (scriptId) => {
    const script = scripts.find(s => s.id === scriptId);
    return script ? (script.attribute === 'box' ? '盒装' : '城限') : '';
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
          <Select
            placeholder="选择DM"
            value={searchDmId ? Number(searchDmId) : undefined}
            onChange={(value) => setSearchDmId(value ? String(value) : '')}
            style={{ width: 150 }}
            allowClear
          >
            {dms.map(dm => (
              <Select.Option key={dm.id} value={dm.id}>{dm.name}</Select.Option>
            ))}
          </Select>
          <Input.Search
            placeholder="剧本名称"
            value={searchScriptName}
            onChange={(e) => setSearchScriptName(e.target.value)}
            style={{ width: 150 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Tooltip title="下载导入模板（剧本名称和DM姓名需在系统中已存在）">
            <Button icon={<FileExcelOutlined />} onClick={handleDownloadTemplate}>下载模板</Button>
          </Tooltip>
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

      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        rowSelection={rowSelection}
      />

      <Modal
        title={editingId ? '编辑开本记录' : '新增开本记录'}
        open={visible}
        onCancel={() => setVisible(false)}
        onOk={handleSubmit}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="script_id" label="剧本名称" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children">
              {scripts.map(script => (
                <Select.Option key={script.id} value={script.id}>{script.name} ({script.attribute === 'box' ? '盒装' : '城限'})</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="dm_id" label="DM姓名" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children">
              {dms.map(dm => (
                <Select.Option key={dm.id} value={dm.id}>{dm.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="session_date" label="开本日期" rules={[{ required: true }]}>
            <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="session_time" label="开本时间" rules={[{ required: true }]}>
            <Input type="time" />
          </Form.Item>
          <Form.Item name="props_fee" label="开本费" rules={[{ type: 'number' }]}>
            <InputNumber min={0} step={0.01} />
          </Form.Item>
          <Form.Item name="praise_count" label="好评数量" rules={[{ type: 'number', min: 0 }]}>
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default SessionManagement;
