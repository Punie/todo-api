require('./config/config');

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const { ObjectID } = require('mongodb');

require('./db/mongoose');
const { Todo } = require('./models/todo');
const { User } = require('./models/user');
const { authenticate } = require('./middlewares/authenticate');

const app = express();

const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.get('/todos', authenticate, (req, res) => Todo
  .find({ _creator: req.user._id })
  .then(todos => res.send({ todos }))
  .catch(err => res.status(400).send(err)));

app.get('/todos/:id', authenticate, (req, res) => {
  const { id } = req.params;

  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  return Todo
    .findOne({ _id: id, _creator: req.user._id })
    .then(todo => (todo ? res.send({ todo }) : res.status(404).send()))
    .catch(err => res.status(400).send());
});

app.post('/todos', authenticate, (req, res) => {
  const todo = new Todo({
    text: req.body.text,
    _creator: req.user._id
  });

  return todo
    .save()
    .then(doc => res.send(doc))
    .catch(err => res.status(400).send(err));
});

app.patch('/todos/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const body = _.pick(req.body, ['text', 'completed']);

  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  if (_.isBoolean(body.completed) && body.completed) {
    body.completedAt = new Date().getTime();
  } else {
    body.completed = false;
    body.completedAt = null;
  }

  return Todo
    .findOneAndUpdate({ _id: id, _creator: req.user._id }, { $set: body }, { new: true })
    .then(todo => (todo ? res.send({ todo }) : res.status(404).send()))
    .catch(err => res.status(400).send());
});

app.delete('/todos/:id', authenticate, (req, res) => {
  const { id } = req.params;

  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  return Todo
    .findOneAndRemove({ _id: id, _creator: req.user._id })
    .then(todo => (todo ? res.send({ todo }) : res.status(404).send()))
    .catch(err => res.status(400).send());
});

app.post('/users', (req, res) => {
  const body = _.pick(req.body, ['email', 'password']);
  const user = new User(body);

  return user
    .save()
    .then(() => user.generateAuthToken())
    .then(token => res.header('x-auth', token).send(user))
    .catch(err => res.status(400).send(err));
});

app.post('/users/login', (req, res) => {
  const body = _.pick(req.body, ['email', 'password']);

  User
    .findByCredentials(body.email, body.password)
    .then(user => user
      .generateAuthToken()
      .then(token => res.header('x-auth', token).send(user)))
    .catch(err => res.status(400).send());
});

app.delete('/users/me/token', authenticate, (req, res) => {
  req.user
    .removeToken(req.token)
    .then(() => res.status(200).send())
    .catch(err => res.status(400).send());
});

app.get('/users/me', authenticate, (req, res) => res.send(req.user));

app.listen(port, () => {
  console.log(`Started listening on port ${port}`);
});

module.exports = { app };
