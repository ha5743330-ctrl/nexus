import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

const sampleUsers = [
  {
    name: 'Ayesha Khan',
    email: 'ayesha@nexus.dev',
    password: 'Password123',
    role: 'entrepreneur',
    bio: 'Building the future of fintech in South Asia.',
    startupName: 'PayWave',
    pitchSummary: 'A mobile-first payments platform for underbanked SMEs.',
    fundingNeeded: '$500,000',
    industry: 'Fintech',
    location: 'Islamabad, PK',
    foundedYear: 2023,
    teamSize: 8,
  },
  {
    name: 'David Chen',
    email: 'david@nexus.dev',
    password: 'Password123',
    role: 'investor',
    bio: 'Early-stage investor focused on fintech and climate tech.',
    investmentInterests: ['Fintech', 'Climate Tech'],
    investmentStage: ['Seed', 'Series A'],
    portfolioCompanies: ['Acme Corp', 'GreenGrid'],
    totalInvestments: 12,
    minimumInvestment: '$25,000',
    maximumInvestment: '$1,000,000',
  },
];

const seed = async () => {
  await connectDB();
  await User.deleteMany({ email: { $in: sampleUsers.map((u) => u.email) } });
  await User.create(sampleUsers);
  console.log(`Seeded ${sampleUsers.length} users.`);
  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
