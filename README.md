# VisaConnect

A comprehensive immigration journey platform that helps users connect with their immigration community, share experiences, and navigate their visa journey together.

## Features

- User authentication and account management
- Interactive wizard for personal background and preferences
- Community knowledge sharing
- Lifestyle and travel exploration tools
- Progressive Web App (PWA) support
- Responsive design with Tailwind CSS

## Tech Stack

- React 19 with TypeScript
- Express.js backend
- Firebase for authentication and database
- Tailwind CSS for styling
- PWA capabilities

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## TODO

### Design System Improvements

- **Input Component Refactoring**: Create a reusable `Input` component to ensure consistent styling across all forms
  - Current issue: `LocationInput` uses different styling (`rounded-lg`, `focus:ring-blue-500`) than app standard (`rounded-xl`, `focus:ring-sky-300`)
  - Requires updating ALL input fields across the app (CreateAccountPage, LoginScreen, PostJobScreen, etc.)
  - Should be handled in a dedicated branch for design system consistency

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
