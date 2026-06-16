import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { dmApi } from '../api';
import { PageShell, RecordCount, tablePagination, Toolbar, TypeTag } from '../components/ui';

const { Option } = Select;

function DmManagement() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchName, setSearchName] = useState('');

  useEffect(() => {
    fetchData();
  }, [searchName]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await dmApi.list({ name: searchName });
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
      name: record.name,
      phone: record.phone,
      type: record.type
    });
    setEditingId(record.id);
    setVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await dmApi.delete(id);
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
      await dmApi.batchDelete(selectedRows);
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
      if (editingId) {
        await dmApi.update(editingId, values);
        message.success('更新成功');
      } else {
        await dmApi.create(values);
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
      await dmApi.import(file);
      message.success('导入成功');
      fetchData();
    } catch (error) {
      message.error('导入失败');
    }
    return false;
  };

  const handleExport = async () => {
    try {
      const response = await dmApi.export();
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${String(now.getMilliseconds()).padStart(3, '0')}`;
      link.download = `DM管理${timestamp}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      message.error('导出失败');
    }
  };

  const columns = [
    { title: 'DM姓名', dataIndex: 'name', key: 'name' },
    { title: '手机号', dataIndex: 'phone', key: 'phone' },
    {
      title: 'DM类型',
      dataIndex: 'type',
      key: 'type',
      render: (text) => <TypeTag value={text} />
    },
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
    <PageShell title="DM 管理" description="维护主持人资料、类型和联系方式。">
      <Toolbar
        filters={(
          <Input.Search
            placeholder="按姓名搜索"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            style={{ width: 220 }}
          />
        )}
        meta={<RecordCount count={data.length} selected={selectedRows.length} />}
        actions={(
          <>
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

      <Table
        className="app-table"
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        rowSelection={rowSelection}
        size="middle"
        scroll={{ x: 720 }}
        pagination={tablePagination('DM')}
      />

      <Modal
        title={editingId ? '编辑DM' : '新增DM'}
        open={visible}
        onCancel={() => setVisible(false)}
        onOk={handleSubmit}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="DM姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="手机号" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="DM类型" rules={[{ required: true }]}>
            <Select>
              <Option value="parttime">打野</Option>
              <Option value="step">阶梯</Option>
              <Option value="fulltime">全职</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}

export default DmManagement;
