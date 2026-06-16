import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const { Title, Text } = Typography;

function Login() {
  const { login, isAuthenticated } = useAuth();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const target = location.state?.from?.pathname || '/';

  if (isAuthenticated) {
    return <Navigate to={target} replace />;
  }

  const handleFinish = async (values) => {
    setError('');
    setSubmitting(true);

    try {
      await login(values.username, values.password);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || '账号或密码错误');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f7fb',
      padding: 24
    }}>
      <Card style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <Title level={3} style={{ marginBottom: 8 }}>剧本杀DM管理</Title>
          <Text type="secondary">登录后继续使用系统</Text>
        </div>

        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form layout="vertical" onFinish={handleFinish}>
          <Form.Item
            name="username"
            label="账号"
            rules={[{ required: true, message: '请输入账号' }]}
          >
            <Input prefix={<UserOutlined />} autoComplete="username" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={submitting}>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  );
}

export default Login;
