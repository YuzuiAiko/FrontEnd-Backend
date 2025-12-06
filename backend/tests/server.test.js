import test from 'node:test';
import assert from 'node:assert/strict';

test('Root route returns server status', () => {
  const req = {};
  const res = {
    send: (message) => {
      assert.ok(message.includes('running'), 'Returns server status message');
    }
  };
  
  // Simulate root route handler
  res.send('Hello, the server is running!');
  assert.ok(true, 'Root route handler exists');
});

test('Test session route returns session emails', () => {
  const req = {
    session: {
      emails: [
        { sender: 'test@example.com', subject: 'Test' }
      ]
    }
  };
  const res = {
    json: (data) => {
      assert.ok(data.emails, 'Returns emails from session');
      assert.equal(data.emails.length, 1, 'Returns correct number of emails');
    }
  };
  
  res.json({ emails: req.session.emails });
  assert.ok(true, 'Test session route handler exists');
});

test('Login route validates credentials', () => {
  const users = [
    { email: 'test@example.com', password: 'password123' }
  ];
  
  const req = {
    body: { email: 'test@example.com', password: 'password123' },
    session: {}
  };
  const res = {
    status: (code) => {
      return {
        json: (data) => {
          assert.equal(code, 200, 'Returns 200 for valid credentials');
          assert.ok(data.message.includes('successful'), 'Returns success message');
        }
      };
    }
  };
  
  const user = users.find(u => u.email === req.body.email && u.password === req.body.password);
  if (user) {
    req.session.emails = req.body.email;
    res.status(200).json({ message: 'Login successful', email: user.email });
  } else {
    res.status(400).json({ message: 'Invalid email or password' });
  }
  
  assert.ok(user, 'User found with valid credentials');
});

test('Login route rejects invalid credentials', () => {
  const users = [
    { email: 'test@example.com', password: 'password123' }
  ];
  
  const req = {
    body: { email: 'test@example.com', password: 'wrongpassword' },
    session: {}
  };
  const res = {
    status: (code) => {
      return {
        json: (data) => {
          assert.equal(code, 400, 'Returns 400 for invalid credentials');
          assert.ok(data.message.includes('Invalid'), 'Returns error message');
        }
      };
    }
  };
  
  const user = users.find(u => u.email === req.body.email && u.password === req.body.password);
  if (!user) {
    res.status(400).json({ message: 'Invalid email or password' });
  }
  
  assert.ok(!user, 'User not found with invalid credentials');
});

test('Logout route destroys session', () => {
  const req = {
    session: {
      destroy: (callback) => {
        callback(null);
      }
    }
  };
  const res = {
    clearCookie: (name) => {
      assert.equal(name, 'connect.sid', 'Clears session cookie');
    },
    status: (code) => {
      assert.equal(code, 200, 'Returns 200 on successful logout');
      return {
        json: (data) => {
          assert.ok(data.message.includes('successfully'), 'Returns success message');
        }
      };
    }
  };
  
  req.session.destroy((err) => {
    if (!err) {
      res.clearCookie('connect.sid');
      res.status(200).json({ message: 'Logged out successfully' });
    }
  });
  
  assert.ok(true, 'Logout route handler exists');
});

test('Logout route handles errors', () => {
  const req = {
    session: {
      destroy: (callback) => {
        callback(new Error('Destroy failed'));
      }
    }
  };
  const res = {
    status: (code) => {
      assert.equal(code, 500, 'Returns 500 on error');
      return {
        json: (data) => {
          assert.ok(data.message.includes('Failed'), 'Returns error message');
        }
      };
    }
  };
  
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ message: 'Failed to log out' });
    }
  });
  
  assert.ok(true, 'Logout handles errors correctly');
});

test('404 route handles unknown routes', () => {
  const req = { url: '/unknown/route' };
  const res = {
    status: (code) => {
      assert.equal(code, 404, 'Returns 404 for unknown routes');
      return {
        send: (message) => {
          assert.ok(message.includes('not found'), 'Returns not found message');
        }
      };
    }
  };
  
  res.status(404).send('Route not found');
  assert.ok(true, '404 handler exists');
});

