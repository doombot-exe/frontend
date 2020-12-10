import React, { Suspense, lazy } from 'react';
import { Switch, Route, useRouteMatch, Redirect, useHistory, Link } from 'react-router-dom';
import { History } from 'history';
import CoursePage from '../Courses/CoursePage';
import Cookies from 'js-cookie';
import { Container, Navbar, NavbarBrand, Nav, NavDropdown, Row, Col } from 'react-bootstrap';
import { AnimatePresence } from 'framer-motion';
import './NavWrapper.css';
import NavbarCollapse from 'react-bootstrap/NavbarCollapse';
import { CookieEnum } from '../Enums/CookieEnum';
import { version } from '../../package.json';
import logger from '../Utilities/Logger';
import { logout } from '../APIInterfaces/BackendAPI/Requests/UserRequests';
import localPreferences from '../Utilities/LocalPreferences';
import { getUserRole, unauthorizedRedirect, UserRole } from '../Enums/UserRole';
import { CircularProgress } from '@material-ui/core';

// Imports for routing.
import URLBreadcrumb from './URLBreadcrumb';
import CourseCreationPage from '../Courses/CourseCreation/CourseCreationPage';
import SimpleProblemPage from '../Assignments/SimpleProblemPage';
import EnrollUserPage from '../Courses/EnrollUserPage';
import { ProvideFeedback } from './ProvideFeedback';
import AccountWrapper from '../Account/AccountWrapper';
import SettingsPage from '../Courses/Settings/SettingsPage';
import CourseProvider from '../Courses/CourseProvider';
import PrintEverything from '../Courses/TopicGrades/PrintEverything';
import { PrintLoadingProvider } from '../Contexts/PrintLoadingContext';

const TopicSettingsPage = lazy(() => import('../Courses/TopicSettings/TopicSettingsPage'));
const TopicGradingPage = lazy(() => import('../Courses/TopicGrades/GradingPage'));
const ProblemEditor = lazy(() => import('../Assignments/ProblemEditor'));
const AdviserPage = lazy(() => import('../Adviser/AdviserPage'));
const CourseDetailsPage = lazy(() => import('../Courses/CourseDetailsPage'));
const { session } = localPreferences;


interface NavWrapperProps {

}

export const userContext = React.createContext({ userType: 'Professor' });

// TODO find a place to put this
// Once cookies are reactive we won't need to use the history object anymore thus this method will have no react dependencies
// Until then leaving here
export const performLogout = async (history: History) => {
    try {
        await logout();
    } catch (e) {
        logger.error('Error logging out', e);
    }

    Cookies.remove(CookieEnum.SESSION);
    session.nullifySession();

    history.push('/');
};

/**
 * The NavWrapper is intended to allow for providing toolbars and menus for navigation.
 * Once authenticated, all routes should pass-through this layer to ensure nav elements are displayed.
 */
export const NavWrapper: React.FC<NavWrapperProps> = () => {
    const { path } = useRouteMatch();
    const history = useHistory();
    const sessionCookie = Cookies.get(CookieEnum.SESSION);
    const userName = localPreferences.session.username;
    const { Provider } = userContext;

    // TODO: Check if the user has been deauthenticated (ex: expired) and display a message.
    if (!sessionCookie) {
        logger.info('Logging out due to missing session token.');
        unauthorizedRedirect(false);
        return <Redirect to={{
            pathname: '/'
        }} />;
    }

    const logoutClicked = async () => {
        performLogout(history);
    };

    return (
        <Container fluid id='navbarParent'>
            {/* Header bar */}
            <Navbar role='navigation' variant='dark' bg='dark' className="toolbar mr-auto">
                <NavbarBrand as={Link} to="/common/courses">
                    <img
                        src={
                            // Fair warning, don't === this, it's not a real boolean.
                            window.Modernizr.webp ?
                                '/rederly-logo-offwhite.webp' :
                                '/rederly-logo-offwhite.png'
                        }
                        className='d-inline-block align-top'
                        alt='Rederly logo'
                        height={50}
                        width={155}
                    />
                </NavbarBrand>
                <NavbarCollapse>
                    <Nav className="text-center mr-auto">
                        {/* <Link to='/common/courses'>Courses</Link> */}
                    </Nav>
                    <Nav className="float-right">
                        <ProvideFeedback />
                    </Nav>
                    <Nav className="float-right">
                        <NavDropdown title={`Welcome, ${userName}`} id='account-dropdown'>
                            <NavDropdown.Item onClick={()=>{history.push(`${path}/account`);}}>My Account</NavDropdown.Item>
                            {getUserRole() !== UserRole.STUDENT &&
                                <NavDropdown.Item onClick={()=>{history.push(`${path}/editor`);}}>Problem Editor</NavDropdown.Item>
                            }
                            <NavDropdown.Item onClick={logoutClicked}>Log out</NavDropdown.Item>
                        </NavDropdown>
                    </Nav>
                </NavbarCollapse>
            </Navbar>
            {/* Routing for the page content */}
            <Container fluid role='main'>
                {/* TODO: Make a better generic loading UI like in CourseProvider */}
                <Suspense fallback={<CircularProgress />}>
                    <Provider value={{userType: getUserRole()}}>
                        <AnimatePresence initial={false}>
                            <URLBreadcrumb key='URLBreadcrumb' />
                            <Switch>
                                <Route exact path={`${path}/account`}>
                                    <AccountWrapper />
                                </Route>
                                <Route exact path={`${path}/editor`}>
                                    <ProblemEditor />
                                </Route>
                                <Route exact path={`${path}/adviser`}>
                                    <AdviserPage />
                                </Route>
                                <Route exact path={`${path}/courses`}>
                                    <CoursePage />
                                </Route>
                                <Route exact path={`${path}/courses/new`}>
                                    <CourseCreationPage />
                                </Route>
                                <Route path={`${path}/courses/settings/:courseId`}>
                                    <SettingsPage />
                                </Route>
                                <Route path={`${path}/courses/enroll/:enrollCode`}>
                                    <EnrollUserPage />
                                </Route>
                                <Route path={`${path}/courses/:courseId`}>
                                    <CourseProvider>
                                        <Switch>
                                            {getUserRole() !== UserRole.STUDENT &&
                                        <Route path={`${path}/courses/:courseId/topic/:topicId/settings`}>
                                            <TopicSettingsPage />
                                        </Route>}
                                            {getUserRole() !== UserRole.STUDENT &&
                                        <Route exact path={`${path}/courses/:courseId/topic/:topicId/grading/print/:userId`}>
                                            <PrintLoadingProvider>
                                                <PrintEverything />
                                            </PrintLoadingProvider>
                                        </Route>}
                                            {getUserRole() !== UserRole.STUDENT &&
                                        <Route exact path={`${path}/courses/:courseId/topic/:topicId/grading`}>
                                            <TopicGradingPage />
                                        </Route>}
                                            <Route exact path={`${path}/courses/:courseId/topic/:topicId`}>
                                                <SimpleProblemPage />
                                            </Route>
                                            <Route exact path={`${path}/courses/:courseId/settings`}>
                                                <SettingsPage />
                                            </Route>
                                            <Route exact path={`${path}/courses/:courseId`}>
                                                <CourseDetailsPage />
                                            </Route>
                                            <Route>
                                                {/* <NoPage/> */}
                                                <h1>Page not found.</h1>
                                                <Redirect to={{
                                                    pathname: '/'
                                                }} />
                                            </Route>
                                        </Switch>
                                    </CourseProvider>
                                </Route>
                                <Route path='/'>
                                    {/* <NoPage/> */}
                                    <h1>Page not found.</h1>
                                </Route>
                            </Switch>
                        </AnimatePresence>
                    </Provider>
                </Suspense>
                <Navbar fixed="bottom" variant='dark' bg='dark' className='footer'>
                    <Row><Col>You&apos;re using v{version} of Rederly!</Col></Row>
                </Navbar>
            </Container>
        </Container>
    );
};
export default NavWrapper;