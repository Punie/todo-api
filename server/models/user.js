const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const _ = require('lodash');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      isAsync: false,
      validator: validator.isEmail,
      message: '{VALUE} is not a valid email'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  tokens: [{
    access: {
      type: String,
      required: true
    },
    token: {
      type: String,
      required: true
    }
  }]
});

UserSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();

  return _.pick(userObject, ['_id', 'email'])
};

UserSchema.methods.generateAuthToken = function () {
  const user = this;
  const access = 'auth';
  const token = jwt
    .sign({ _id: user._id.toHexString(), access }, 'abc123')
    .toString();

  user.tokens = user.tokens.concat([{ access, token }]);

  return user.save().then(() => token);
};

UserSchema.statics.findByToken = function (token) {
  const User = this;

  try {
    const decoded = jwt.verify(token, 'abc123');

    return User.findOne({
      '_id': decoded._id,
      'tokens.access': 'auth',
      'tokens.token': token
    });
  } catch (e) {
    return Promise.reject();
  }

};

const User = mongoose.model('User', UserSchema);

module.exports = { User };
