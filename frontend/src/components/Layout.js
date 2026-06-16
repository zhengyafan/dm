import { useEffect, useState } from 'react';
import { Button, Form, Input, Layout, Menu, message, Modal, Space } from 'antd';
import { 
  HomeOutlined, 
  UserOutlined, 
  BookOutlined, 
  CalendarOutlined, 
  CalculatorOutlined, 
  FileTextOutlined, 
  BarChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import moment from 'moment';
import { useAuth } from '../auth/AuthContext';
import { authApi } from '../api';

const { Sider, Content, Header } = Layout;

const menuItems = [
  { key: '/', label: '首页', icon: <HomeOutlined /> },
  { key: '/dm', label: 'DM管理', icon: <UserOutlined /> },
  { key: '/script', label: '本单管理', icon: <BookOutlined /> },
  { key: '/session', label: '开本记录', icon: <CalendarOutlined /> },
  { key: '/salary', label: '工资计算', icon: <CalculatorOutlined /> },
  { key: '/reimbursement', label: '报销管理', icon: <FileTextOutlined /> },
  { key: '/cashflow', label: '流水管理', icon: <BarChartOutlined /> },
];

function LayoutComponent({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm] = Form.useForm();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(moment().format('YYYY-MM-DD HH:mm:ss'));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(moment().format('YYYY-MM-DD HH:mm:ss'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChangePassword = async () => {
    try {
      const values = await passwordForm.validateFields();
      setChangingPassword(true);
      await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      message.success('密码修改成功');
      passwordForm.resetFields();
      setPasswordModalOpen(false);
    } catch (err) {
      if (err?.errorFields) {
        return;
      }
      message.error(err.response?.data?.error || '密码修改失败');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light">
        <div className="logo" style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontSize: collapsed ? 16 : 20,
          fontWeight: 'bold',
          color: '#1890ff'
        }}>
          {collapsed ? 'DM' : '剧本杀DM管理'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          padding: 0, 
          background: '#fff', 
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: 16,
              width: 64,
              height: 64,
            }}
          />
          <Space style={{ paddingRight: 24 }}>
            <span style={{ color: '#888', fontSize: 14 }}>{currentTime}</span>
            <span style={{ color: '#555', fontSize: 14 }}>{user?.display_name || user?.username}</span>
            <Button
              type="text"
              onClick={() => setPasswordModalOpen(true)}
            >
              修改密码
            </Button>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
            >
              退出
            </Button>
          </Space>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: '#f5f5f5'
          }}
        >
          {children}
        </Content>
      </Layout>
      <Modal
        title="修改密码"
        open={passwordModalOpen}
        confirmLoading={changingPassword}
        onOk={handleChangePassword}
        onCancel={() => {
          setPasswordModalOpen(false);
          passwordForm.resetFields();
        }}
        okText="保存"
        cancelText="取消"
      >
        <Form form={passwordForm} layout="vertical">
          <Form.Item
            name="currentPassword"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 8, message: '新密码至少需要 8 位' }
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的新密码不一致'));
                }
              })
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}

export default LayoutComponent;
