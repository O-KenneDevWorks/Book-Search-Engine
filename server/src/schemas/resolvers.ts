import { UserInputError } from 'apollo-server-express';
import User from '../models/User.js';
import { signToken } from '../services/auth.js';
import { JwtPayload } from '../services/auth'; // Ensure JwtPayload type exists for the token payload

// Define the context interface
interface Context {
  user?: JwtPayload;
}

interface BookInput {
  bookId: string;
  authors?: string[];
  description?: string;
  title: string;
  image?: string;
  link?: string;
}

export const resolvers = {
  Query: {
    me: async (_: unknown, __: unknown, context: Context) => {
      const { user } = context;
      if (!user) {
        throw new UserInputError('Not authenticated');
      }
      return await User.findById(user._id);
    },
  },
  Mutation: {
    login: async (
      _: unknown,
      { email, password }: { email: string; password: string }
    ) => {
      const user = await User.findOne({ email });
      if (!user) {
        throw new UserInputError("Can't find this user");
      }

      const correctPw = await user.isCorrectPassword(password);
      if (!correctPw) {
        throw new UserInputError('Incorrect password');
      }

      const token = signToken(user.username, user.email, user._id);
      return { token, user };
    },

    addUser: async (
      _: unknown,
      { username, email, password }: { username: string; email: string; password: string }
    ) => {
      const user = await User.create({ username, email, password });
      if (!user) {
        throw new UserInputError('Error creating user');
      }

      const token = signToken(user.username, user.email, user._id);
      return { token, user };
    },

    saveBook: async (
      _: unknown,
      { bookData }: { bookData: BookInput },
      context: Context
    ) => {
      const { user } = context;
      if (!user) {
        throw new UserInputError('Not authenticated');
      }

      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { $addToSet: { savedBooks: bookData } },
        { new: true, runValidators: true }
      );
      return updatedUser;
    },

    removeBook: async (
      _: unknown,
      { bookId }: { bookId: string },
      context: Context
    ) => {
      const { user } = context;
      if (!user) {
        throw new UserInputError('Not authenticated');
      }

      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { $pull: { savedBooks: { bookId } } },
        { new: true }
      );
      if (!updatedUser) {
        throw new UserInputError("Couldn't find user with this id!");
      }
      return updatedUser;
    },
  },
};
