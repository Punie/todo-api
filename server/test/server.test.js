/* eslint no-undef: 0 */
/* eslint no-unused-expressions: 0 */
/* eslint padded-blocks: 0 */

const { expect } = require('chai');
const request = require('supertest');
const { ObjectID } = require('mongodb');

const { app } = require('../server');
const { Todo } = require('../models/todo');

const todos = [
  {
    _id: new ObjectID(),
    text: 'First test todo'
  },
  {
    _id: new ObjectID(),
    text: 'Second test todo',
    completed: true,
    completedAt: 333
  }
];

beforeEach((done) => {
  Todo
    .remove({})
    .then(() => Todo.insertMany(todos))
    .then(() => done());
});

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
