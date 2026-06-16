import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber, message, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import { scriptApi } from '../api';
import { MoneyText, PageShell, RecordCount, tablePagination, Toolbar, TypeTag } from '../components/ui';

const { Option } = Select;

function ScriptManagement() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchName, setSearchName] = useState('');
  const [searchAttribute, setSearchAttribute] = useState('');
  const [searchGenre, setSearchGenre] = useState('');

  useEffect(() => {
    fetchData();
  }, [searchName, searchAttribute, searchGenre]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await scriptApi.list({
        name: searchName,
        attribute: searchAttribute,
        genre: searchGenre
      });
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
      attribute: record.attribute,
      genre: record.genre,
      player_num: record.player_num,
      price: record.price
    });
    setEditingId(record.id);
    setVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await scriptApi.delete(id);
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
      await scriptApi.batchDelete(selectedRows);
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
        await scriptApi.update(editingId, values);
        message.success('更新成功');
      } else {
        await scriptApi.create(values);
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
      await scriptApi.import(file);
      message.success('导入成功');
      fetchData();
    } catch (error) {
      console.error('导入错误:', error);
      message.error('导入失败: ' + (error.response?.data?.error || error.message || '未知错误'));
    } finally {
      message.destroy();
      // 重置文件输入
      const input = document.getElementById('import-btn');
      if (input) input.value = '';
    }
    return false;
  };

  const handleExport = async () => {
    try {
      const response = await scriptApi.export();
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${String(now.getMilliseconds()).padStart(3, '0')}`;
      link.download = `剧本管理${timestamp}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      message.error('导出失败');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await scriptApi.downloadTemplate();
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'script_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      message.error('下载模板失败');
    }
  };

  const columns = [
    { title: '剧本名称', dataIndex: 'name', key: 'name' },
    {
      title: '剧本属性',
      dataIndex: 'attribute',
      key: 'attribute',
      render: (text) => <TypeTag value={text} />
    },
    { title: '剧本类型', dataIndex: 'genre', key: 'genre' },
    { title: '剧本人数', dataIndex: 'player_num', key: 'player_num' },
    { title: '剧本价格', dataIndex: 'price', key: 'price', render: (text) => <MoneyText value={text} /> },
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
    <PageShell title="本单管理" description="维护剧本资料、价格、人数和盒装/城限属性。">
      <Toolbar
        filters={(
          <>
          <Input.Search
            placeholder="按名称搜索"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            style={{ width: 200 }}
          />
          <Select
            placeholder="剧本属性"
            value={searchAttribute}
            onChange={(value) => setSearchAttribute(value)}
            style={{ width: 120 }}
            allowClear
          >
            <Option value="box">盒装</Option>
            <Option value="city">城限</Option>
          </Select>
          <Input.Search
            placeholder="剧本类型"
            value={searchGenre}
            onChange={(e) => setSearchGenre(e.target.value)}
            style={{ width: 150 }}
          />
          </>
        )}
        meta={<RecordCount count={data.length} selected={selectedRows.length} />}
        actions={(
          <>
          <Tooltip title="下载导入模板（仅包含一条示例数据）">
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
        scroll={{ x: 920 }}
        pagination={tablePagination('剧本')}
      />

      <Modal
        title={editingId ? '编辑剧本' : '新增剧本'}
        open={visible}
        onCancel={() => setVisible(false)}
        onOk={handleSubmit}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="剧本名称" rules={[{ required: true, message: '请输入剧本名称' }]}>
            <Input placeholder="必填" />
          </Form.Item>
          <Form.Item name="attribute" label="剧本属性" rules={[{ required: true, message: '请选择剧本属性' }]}>
            <Select>
              <Option value="box">盒装</Option>
              <Option value="city">城限</Option>
            </Select>
          </Form.Item>
          <Form.Item name="genre" label="剧本类型">
            <Input placeholder="非必填" />
          </Form.Item>
          <Form.Item name="player_num" label="剧本人数">
            <InputNumber min={1} max={20} placeholder="非必填" />
          </Form.Item>
          <Form.Item name="price" label="剧本价格">
            <InputNumber min={0} step={0.01} placeholder="非必填" />
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}

export default ScriptManagement;
