import React from 'react';
import { Switch, Route, useRouteMatch, Redirect, useHistory, Link } from 'react-router-dom';
import { History } from 'history';
import CoursePage from '../Courses/CoursePage';
import Cookies from 'js-cookie';
import { Container, Navbar, NavbarBrand, Nav, NavDropdown, Row, Col } from 'react-bootstrap';
import CourseDetailsPage from '../Courses/CourseDetailsPage';
import { AnimatePresence } from 'framer-motion';
import './NavWrapper.css';
import NavbarCollapse from 'react-bootstrap/NavbarCollapse';
import { getUserRole, unauthorizedRedirect, UserRole } from '../Enums/UserRole';
import CourseCreationPage from '../Courses/CourseCreation/CourseCreationPage';
import SimpleProblemPage from '../Assignments/SimpleProblemPage';
import AdviserPage from '../Adviser/AdviserPage';
import EnrollUserPage from '../Courses/EnrollUserPage';
import { ProvideFeedback } from './ProvideFeedback';
import AccountWrapper from '../Account/AccountWrapper';
import { CookieEnum } from '../Enums/CookieEnum';
import URLBreadcrumb from './URLBreadcrumb';
import SettingsPage from '../Courses/Settings/SettingsPage';
import { version } from '../../package.json';
import CourseProvider from '../Courses/CourseProvider';
import TopicSettingsPage from '../Courses/TopicSettings/TopicSettingsPage';
import logger from '../Utilities/Logger';
import TopicGradingPage from '../Courses/TopicGrades/GradingPage';
import { ProblemEditor } from '../Assignments/ProblemEditor';
import PrintEverything from '../Courses/TopicGrades/PrintEverything';
import { PrintLoadingProvider } from '../Contexts/PrintLoadingContext';
import localPreferences from '../Utilities/LocalPreferences';
import { logout } from '../APIInterfaces/BackendAPI/Requests/UserRequests';
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
                                        <Route path={`${path}/courses/:courseId/topic/:topicId/grading`}>
                                            <TopicGradingPage />
                                        </Route>}
                                        <Route path={`${path}/courses/:courseId/topic/:topicId`}>
                                            <SimpleProblemPage />
                                        </Route>
                                        <Route path={`${path}/courses/:courseId/settings`}>
                                            <SettingsPage />
                                        </Route>
                                        <Route path={`${path}/`}>
                                            <CourseDetailsPage />
                                        </Route>
                                    </Switch>
                                </CourseProvider>
                            </Route>
                            <Route path="/">
                                {/* <NoPage/> */}
                                <h1>Page not found.</h1>
                            </Route>
                        </Switch>
                    </AnimatePresence>
                </Provider>
                <Navbar fixed="bottom" variant='dark' bg='dark' className='footer'>
                    <Row><Col>You&apos;re using v{version} of Rederly!</Col></Row>
                </Navbar>
            </Container>
        </Container>
    );
};
export default NavWrapper;