/**
 * Demo data seeder for the social media posting platform
 * Creates test users, posts, comments, and reactions
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // Create demo users
    const users = await queryInterface.bulkInsert('users', [
      {
        username: 'alice_wonder',
        email: 'alice@example.com',
        first_name: 'Alice',
        last_name: 'Wonder',
        bio: '🚀 Software engineer passionate about creating amazing user experiences. Love coding, traveling, and photography!',
        avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b29c?w=150&h=150&fit=crop&crop=face',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        username: 'bob_builder',
        email: 'bob@example.com',
        first_name: 'Bob',
        last_name: 'Builder',
        bio: '🏗️ Full-stack developer and tech enthusiast. Building the future one line of code at a time.',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        username: 'carol_creative',
        email: 'carol@example.com',
        first_name: 'Carol',
        last_name: 'Creative',
        bio: '🎨 Designer and creative thinker. Turning ideas into beautiful digital experiences.',
        avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        username: 'david_dev',
        email: 'david@example.com',
        first_name: 'David',
        last_name: 'Developer',
        bio: '⚡ JavaScript ninja and React enthusiast. Always learning, always building.',
        avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        username: 'emma_explorer',
        email: 'emma@example.com',
        first_name: 'Emma',
        last_name: 'Explorer',
        bio: '🌍 Digital nomad and adventure seeker. Sharing stories from around the world.',
        avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ], { returning: true });

    // Get user IDs (adjust for different database return formats)
    const userIds = users.map((user, index) => user.id || (index + 1));

    // Create demo posts
    const posts = await queryInterface.bulkInsert('posts', [
      {
        user_id: userIds[0],
        content: `🎉 Just launched my new personal portfolio website! After weeks of coding and designing, I'm finally ready to share my work with the world.

Built with React, TypeScript, and Node.js - featuring:
✨ Responsive design
🚀 Fast loading times
📱 Mobile-first approach
🎨 Beautiful animations

Check it out and let me know what you think! Feedback is always welcome.

#WebDevelopment #React #Portfolio #NewProject`,
        privacy_level: 'public',
        is_published: true,
        created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        updated_at: new Date(now.getTime() - 2 * 60 * 60 * 1000)
      },
      {
        user_id: userIds[1],
        content: `🏗️ Working on an exciting new project using microservices architecture!

The challenge: Building a scalable e-commerce platform that can handle millions of users.

Current tech stack:
- Node.js & Express for APIs
- PostgreSQL for data persistence
- Redis for caching
- Docker for containerization
- Kubernetes for orchestration

It's fascinating how each service can be developed, deployed, and scaled independently. The complexity is worth it for the flexibility and resilience it provides.

What's your experience with microservices? Any tips for a fellow builder?

#Microservices #NodeJS #Kubernetes #TechTalk`,
        privacy_level: 'public',
        is_published: true,
        created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
        updated_at: new Date(now.getTime() - 4 * 60 * 60 * 1000)
      },
      {
        user_id: userIds[2],
        content: `🎨 Design inspiration of the day!

Just finished reading "Design Systems" by Alla Kholmatova, and I'm blown away by the insights on building consistent, scalable design languages.

Key takeaways:
• Design systems are more than just style guides
• They should evolve with your product and team
• Documentation is crucial for adoption
• Start small and grow organically

Currently working on establishing a design system for our startup. It's incredible how much time and effort it saves once properly implemented.

What design systems inspire you the most? Drop your favorites below! 👇

#DesignSystems #UXDesign #UIDesign #DesignThinking`,
        privacy_level: 'public',
        is_published: true,
        created_at: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
        updated_at: new Date(now.getTime() - 6 * 60 * 60 * 1000)
      },
      {
        user_id: userIds[3],
        content: `⚡ JavaScript tip of the day: Array.reduce() is your friend!

Instead of writing multiple loops, you can transform and aggregate data in a single pass:

\`\`\`javascript
const orders = [
  { status: 'completed', amount: 100 },
  { status: 'pending', amount: 50 },
  { status: 'completed', amount: 200 }
];

// Get total of completed orders
const completedTotal = orders.reduce((sum, order) => {
  return order.status === 'completed' ? sum + order.amount : sum;
}, 0);

console.log(completedTotal); // 300
\`\`\`

The beauty of reduce() is its versatility - you can build objects, arrays, or any data structure you need.

What's your favorite JavaScript array method? Share your go-to patterns!

#JavaScript #WebDev #CodeTips #Programming`,
        privacy_level: 'public',
        is_published: true,
        created_at: new Date(now.getTime() - 8 * 60 * 60 * 1000), // 8 hours ago
        updated_at: new Date(now.getTime() - 8 * 60 * 60 * 1000)
      },
      {
        user_id: userIds[4],
        content: `🌍 Greetings from the beautiful city of Prague!

Currently working remotely from this stunning location while building a new travel planning app. There's something magical about coding with a view of centuries-old architecture.

The app I'm building will help fellow digital nomads find:
📍 Best co-working spaces
☕ Reliable wifi cafes
🏠 Nomad-friendly accommodations
🤝 Local tech communities

Prague has been incredible for inspiration - the blend of history and modern tech scene is perfect. Already connected with amazing developers at local meetups.

Next stop: Berlin! Where should I explore for the best developer communities?

#DigitalNomad #RemoteWork #Prague #TravelApp #TechCommunity`,
        privacy_level: 'public',
        is_published: true,
        created_at: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
        updated_at: new Date(now.getTime() - 12 * 60 * 60 * 1000)
      },
      {
        user_id: userIds[0],
        content: `📸 Behind the scenes of yesterday's product photoshoot!

Spent the day capturing the essence of our new mobile app interface. It's amazing how the right lighting and composition can make UI screenshots come alive.

Photography and design have more in common than people think:
- Both require attention to detail
- Composition is everything
- Understanding your audience is key
- Sometimes less is more

The photos will be used for our upcoming landing page redesign. Can't wait to see how they perform in user testing!

Anyone else find unexpected connections between their hobbies and professional work?

#Photography #ProductDesign #UI #CreativeProcess`,
        privacy_level: 'public',
        is_published: true,
        created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        user_id: userIds[1],
        content: `🔧 Weekend project update: Building a home automation system!

Started with simple goals:
- Control lights with voice commands
- Monitor temperature and humidity
- Automate morning routines

Tech stack:
- Raspberry Pi 4 as the hub
- Node.js for the backend logic
- React Native app for mobile control
- Home Assistant for device integration

The learning curve was steep, but seeing my coffee maker start brewing when my alarm goes off is pure magic! ☕

Next features to add:
- Security camera integration
- Smart irrigation for plants
- Energy usage monitoring

DIY smart home > expensive commercial systems. Who else is building their own setup?

#HomeAutomation #RaspberryPi #IoT #SmartHome #WeekendProject`,
        privacy_level: 'public',
        is_published: true,
        created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      }
    ], { returning: true });

    // Get post IDs
    const postIds = posts.map((post, index) => post.id || (index + 1));

    // Create demo comments
    await queryInterface.bulkInsert('comments', [
      // Comments on Alice's portfolio post
      {
        post_id: postIds[0],
        user_id: userIds[1],
        parent_id: null,
        content: `Wow, this looks incredible Alice! 🔥 The animations are so smooth and the design is really clean. I especially love the project showcase section.`,
        is_published: true,
        created_at: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
        updated_at: new Date(now.getTime() - 1.5 * 60 * 60 * 1000)
      },
      {
        post_id: postIds[0],
        user_id: userIds[2],
        parent_id: null,
        content: `Beautiful work! The color scheme and typography choices are spot on. How long did it take you to complete?`,
        is_published: true,
        created_at: new Date(now.getTime() - 1.2 * 60 * 60 * 1000),
        updated_at: new Date(now.getTime() - 1.2 * 60 * 60 * 1000)
      },
      {
        post_id: postIds[0],
        user_id: userIds[0],
        parent_id: 2, // Reply to Carol's comment
        content: `Thanks Carol! It took about 3 weeks working evenings and weekends. The design phase took the longest - I went through so many iterations! 😅`,
        is_published: true,
        created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        updated_at: new Date(now.getTime() - 1 * 60 * 60 * 1000)
      },

      // Comments on Bob's microservices post
      {
        post_id: postIds[1],
        user_id: userIds[3],
        parent_id: null,
        content: `Great architecture choice! I've been working with microservices for 2 years now. My advice: invest heavily in monitoring and logging from day one. Distributed tracing is a lifesaver!`,
        is_published: true,
        created_at: new Date(now.getTime() - 3.5 * 60 * 60 * 1000),
        updated_at: new Date(now.getTime() - 3.5 * 60 * 60 * 1000)
      },
      {
        post_id: postIds[1],
        user_id: userIds[4],
        parent_id: null,
        content: `This sounds like an amazing project! Are you using any service mesh like Istio? We found it really helpful for managing service-to-service communication.`,
        is_published: true,
        created_at: new Date(now.getTime() - 3.2 * 60 * 60 * 1000),
        updated_at: new Date(now.getTime() - 3.2 * 60 * 60 * 1000)
      },
      {
        post_id: postIds[1],
        user_id: userIds[1],
        parent_id: 5, // Reply to Emma's comment
        content: `We're evaluating Istio actually! Currently using NGINX for load balancing but looking to add more sophisticated traffic management. How's your experience been?`,
        is_published: true,
        created_at: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        updated_at: new Date(now.getTime() - 3 * 60 * 60 * 1000)
      },

      // Comments on Carol's design systems post
      {
        post_id: postIds[2],
        user_id: userIds[0],
        parent_id: null,
        content: `I'm a huge fan of Material Design and Atlassian Design System! They're so well documented and the components are really thoughtful.`,
        is_published: true,
        created_at: new Date(now.getTime() - 5.5 * 60 * 60 * 1000),
        updated_at: new Date(now.getTime() - 5.5 * 60 * 60 * 1000)
      },
      {
        post_id: postIds[2],
        user_id: userIds[3],
        parent_id: null,
        content: `Shopify's Polaris is another excellent example! The way they handle component variations and states is really impressive. Perfect for complex interfaces.`,
        is_published: true,
        created_at: new Date(now.getTime() - 5.2 * 60 * 60 * 1000),
        updated_at: new Date(now.getTime() - 5.2 * 60 * 60 * 1000)
      },

      // Comments on David's JavaScript tip
      {
        post_id: postIds[3],
        user_id: userIds[2],
        parent_id: null,
        content: `Love this example! Array.map() is probably my most used method, but reduce() is definitely the most powerful. It's like the Swiss Army knife of array methods! 🔧`,
        is_published: true,
        created_at: new Date(now.getTime() - 7.5 * 60 * 60 * 1000),
        updated_at: new Date(now.getTime() - 7.5 * 60 * 60 * 1000)
      },
      {
        post_id: postIds[3],
        user_id: userIds[4],
        parent_id: null,
        content: `Great tip! I also love using Array.some() and Array.every() for validation logic. They make code so much more readable than traditional loops.`,
        is_published: true,
        created_at: new Date(now.getTime() - 7.2 * 60 * 60 * 1000),
        updated_at: new Date(now.getTime() - 7.2 * 60 * 60 * 1000)
      },

      // Comments on Emma's Prague post
      {
        post_id: postIds[4],
        user_id: userIds[1],
        parent_id: null,
        content: `Prague is amazing! For Berlin, definitely check out Factory Berlin and Rocket Internet. The startup scene there is incredible. Also, don't miss the Berlin.JS meetups!`,
        is_published: true,
        created_at: new Date(now.getTime() - 11.5 * 60 * 60 * 1000),
        updated_at: new Date(now.getTime() - 11.5 * 60 * 60 * 1000)
      },
      {
        post_id: postIds[4],
        user_id: userIds[2],
        parent_id: null,
        content: `Your travel app idea sounds fantastic! As someone who struggled to find good co-working spaces while traveling, this would be so helpful. Let me know when you need beta testers! ✈️`,
        is_published: true,
        created_at: new Date(now.getTime() - 11.2 * 60 * 60 * 1000),
        updated_at: new Date(now.getTime() - 11.2 * 60 * 60 * 1000)
      }
    ]);

    // Create demo reactions
    await queryInterface.bulkInsert('reactions', [
      // Reactions on posts
      { user_id: userIds[1], post_id: postIds[0], emoji_unicode: '👍', emoji_name: 'thumbs_up', created_at: now },
      { user_id: userIds[2], post_id: postIds[0], emoji_unicode: '❤️', emoji_name: 'heart', created_at: now },
      { user_id: userIds[3], post_id: postIds[0], emoji_unicode: '🔥', emoji_name: 'fire', created_at: now },
      { user_id: userIds[4], post_id: postIds[0], emoji_unicode: '👏', emoji_name: 'clap', created_at: now },

      { user_id: userIds[0], post_id: postIds[1], emoji_unicode: '👍', emoji_name: 'thumbs_up', created_at: now },
      { user_id: userIds[2], post_id: postIds[1], emoji_unicode: '🤔', emoji_name: 'thinking', created_at: now },
      { user_id: userIds[3], post_id: postIds[1], emoji_unicode: '🔥', emoji_name: 'fire', created_at: now },

      { user_id: userIds[0], post_id: postIds[2], emoji_unicode: '❤️', emoji_name: 'heart', created_at: now },
      { user_id: userIds[1], post_id: postIds[2], emoji_unicode: '👍', emoji_name: 'thumbs_up', created_at: now },
      { user_id: userIds[3], post_id: postIds[2], emoji_unicode: '👏', emoji_name: 'clap', created_at: now },

      { user_id: userIds[0], post_id: postIds[3], emoji_unicode: '🔥', emoji_name: 'fire', created_at: now },
      { user_id: userIds[1], post_id: postIds[3], emoji_unicode: '👍', emoji_name: 'thumbs_up', created_at: now },
      { user_id: userIds[2], post_id: postIds[3], emoji_unicode: '💡', emoji_name: 'bulb', created_at: now },

      { user_id: userIds[0], post_id: postIds[4], emoji_unicode: '✈️', emoji_name: 'airplane', created_at: now },
      { user_id: userIds[1], post_id: postIds[4], emoji_unicode: '👍', emoji_name: 'thumbs_up', created_at: now },
      { user_id: userIds[2], post_id: postIds[4], emoji_unicode: '🌍', emoji_name: 'earth', created_at: now },

      // Some reactions on comments
      { user_id: userIds[0], comment_id: 1, emoji_unicode: '❤️', emoji_name: 'heart', created_at: now },
      { user_id: userIds[2], comment_id: 1, emoji_unicode: '👍', emoji_name: 'thumbs_up', created_at: now },
      { user_id: userIds[1], comment_id: 4, emoji_unicode: '🙏', emoji_name: 'pray', created_at: now },
      { user_id: userIds[3], comment_id: 7, emoji_unicode: '👍', emoji_name: 'thumbs_up', created_at: now }
    ]);

    console.log('✅ Demo data seeded successfully!');
  },

  async down(queryInterface, Sequelize) {
    // Remove seeded data in reverse order
    await queryInterface.bulkDelete('reactions', null, {});
    await queryInterface.bulkDelete('comments', null, {});
    await queryInterface.bulkDelete('posts', null, {});
    await queryInterface.bulkDelete('users', null, {});

    console.log('✅ Demo data removed successfully!');
  }
};