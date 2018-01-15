/* eslint-disable no-undef */
/* eslint-disable no-unused-expressions */
/* eslint-disable padded-blocks */

const { expect } = require('chai');
const request = require('supertest');
const { ObjectID } = require('mongodb');

const { app } = require('../server');
const { Todo } = require('../models/todo');
const { User } = require('../models/user');
const {
  todos,
  users,
  populateTodos,
  populateUsers
} = require('./seed/seed');

beforeEach(populateUsers);
beforeEach(populateTodos);

describe('GET /todos', () => {

  it('should get all todos', (done) => {
    request(app)
      .get('/todos')
      .expect(200)
      .expect((res) => {
        expect(res.body.todos).to.have.lengthOf(2);
      })
      .end(done);
  });

});

describe('GET /todos/:id', () => {

  it('should return todo doc', (done) => {
    request(app)
      .get(`/todos/${todos[0]._id.toHexString()}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.todo.text).to.equal(todos[0].text);
      })
      .end(done);
  });

  it('should return 404 if todo not found', (done) => {
    request(app)
      .get(`/todos/${new ObjectID().toHexString()}`)
      .expect(404)
      .end(done);
  });

  it('should return 404 for invalid object ids', (done) => {
    request(app)
      .get('/todos/123abc')
      .expect(404)
      .end(done);
  });

});

describe('POST /todos', () => {

  it('should create a new todo', (done) => {
    const text = 'Test todo text';

    request(app)
      .post('/todos')
      .send({ text })
      .expect(200)
      .expect((res) => {
        expect(res.body.text).to.equal(text);
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        return Todo
          .find({ text })
          .then((docs) => {
            expect(docs).to.have.lengthOf(1);
            expect(docs[0].text).to.equal(text);
            done();
          })
          .catch(e => done(e));
      });
  });

  it('should not create todo with invalid body data', (done) => {
    request(app)
      .post('/todos')
      .send({})
      .expect(400)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        return Todo
          .find()
          .then((docs) => {
            expect(docs).to.have.lengthOf(2);
            done();
          })
          .catch(e => done(e));
      });
  });

});

describe('PATCH /todos/:id', () => {

  it('should update the todo', (done) => {
    const id = todos[0]._id.toHexString();
    const text = 'This should be the new text';

    request(app)
      .patch(`/todos/${id}`)
      .send({ text, completed: true })
      .expect(200)
      .expect((res) => {
        expect(res.body.todo.text).to.equal(text);
        expect(res.body.todo.completed).to.equal(true);
        expect(res.body.todo.completedAt).to.be.a('number');
      })
      .end(done);
  });

  it('should clear completedAt when todo is not completed', (done) => {
    const id = todos[1]._id.toHexString();
    const text = 'This should be the second new text!';

    request(app)
      .patch(`/todos/${id}`)
      .send({ text, completed: false })
      .expect(200)
      .expect((res) => {
        expect(res.body.todo.text).to.equal(text);
        expect(res.body.todo.completed).to.equal(false);
        expect(res.body.todo.completedAt).to.not.exist;
      })
      .end(done);
  });

});

describe('DELETE /todos/:id', () => {

  it('should remove a todo', (done) => {
    const id = todos[0]._id.toHexString();

    request(app)
      .delete(`/todos/${id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.todo.text).to.equal(todos[0].text);
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        return Todo
          .findById(id)
          .then((todo) => {
            expect(todo).to.not.exist;
            done();
          })
          .catch(e => done(e));
      });
  });

  it('should return 404 if todo not found', (done) => {
    request(app)
      .delete(`/todos/${new ObjectID().toHexString()}`)
      .expect(404)
      .end(done);
  });

  it('should return 404 for invalid object ids', (done) => {
    request(app)
      .delete('/todos/123abc')
      .expect(404)
      .end(done);
  });

});

describe('GET /users/me', () => {

  it('should return user if authenticated', (done) => {
    request(app)
      .get('/users/me')
      .set('x-auth', users[0].tokens[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body._id).to.equal(users[0]._id.toHexString());
        expect(res.body.email).to.equal(users[0].email);
      })
      .end(done);
  });

  it('should return 401 if not authenticated', (done) => {
    request(app)
      .get('/users/me')
      .expect(401)
      .expect((res) => {
        expect(res.body).to.deep.equal({});
      })
      .end(done);
  });

});

describe('POST /users', () => {

  it('should create a user', (done) => {
    const email = 'example@example.com';
    const password = '579xyz!;';

    request(app)
      .post('/users')
      .send({ email, password })
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-auth']).to.exist;
        expect(res.body._id).to.exist;
        expect(res.body.email).to.equal(email);
      })
      .end((err) => {
        if (err) {
          return done(err);
        }

        return User
          .findOne({ email })
          .then((user) => {
            expect(user).to.exist;
            expect(user.password).to.not.equal(password);
            done();
          });
      });
  });

  it('should return validation errors if request invalid', (done) => {
    request(app)
      .post('/users')
      .send({ email: 'invalid', password: '123' })
      .expect(400)
      .end(done);
  });

  it('should not create user if email in use', (done) => {
    request(app)
      .post('/users')
      .send({ email: users[0].email, password: 'someRandomPwd' })
      .expect(400)
      .end(done);
  });

});
