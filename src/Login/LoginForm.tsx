import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Row, Col } from 'react-bootstrap';
import useAlertState from '../Hooks/useAlertState';
import { useHistory } from 'react-router-dom';
import Cookie from 'js-cookie';
import { getUserRoleFromServer } from '../Enums/UserRole';
import { CookieEnum } from '../Enums/CookieEnum';
import { ForgotPasswordButtonAndModal } from './ForgotPasswordButtonAndModal';
import { postLogin } from '../APIInterfaces/BackendAPI/Requests/UserRequests';
import BackendAPIError, { isAxiosError } from '../APIInterfaces/BackendAPI/BackendAPIError';
import ResendVerificationModal from './ResendVerificationModal';
import LogRocket from 'logrocket';

interface LoginFormProps {

}

type LoginFormData = {
    email: string;
    password: string;
}

/**
 * This component renders the Login form, and should redirect the user if login succeeds.
 * 
 * Suggestion: Could useEffect to prevalidate institutional emails?
 */
export const LoginForm: React.FC<LoginFormProps> = () => {
    const [validated, setValidated] = useState(false);
    const [{ message: loginAlertMsg, variant: registrationAlertType }, setLoginAlertMsg] = useAlertState();
    const [formState, setFormState] = useState<LoginFormData>({ email: '', password: '' });
    const [showResendVerificationModal, setShowResendVerificationModal] = useState<boolean>(false);

    const history = useHistory();

    const handleNamedChange = (name: keyof LoginFormData) => {
        return (event: any) => {
            if (name !== event.target.name) {
                console.error(`Mismatched event, ${name} is on ${event.target.name}`);
            }
            const val = event.target.value;
            setFormState({ ...formState, [name]: val });
        };
    };

    const handleLogin = async () => {
        try {
            const resp = await postLogin({
                email: formState.email,
                password: formState.password
            });

            if (resp.status === 200) {
                setLoginAlertMsg({ message: resp.data?.msg || 'Logged in!', variant: 'success' });
                // TODO: Create a User class to massage and error-handle these fields.
                Cookie.set(CookieEnum.USERTYPE, getUserRoleFromServer(resp.data.data.roleId));
                Cookie.set(CookieEnum.USERID, resp.data.data.userId);
                Cookie.set(CookieEnum.USERNAME, `${resp.data.data.firstName} ${resp.data.data.lastName}`);

                LogRocket.identify('qdgaa4/rederly', {
                    name: `${resp.data.data.firstName} ${resp.data.data.lastName}`,
                    email: formState.email,
                    id: resp.data.data.userId,
                });

                history.replace('/common/courses');
            }
        } catch (err) {
            let handled = false;
            if (err instanceof BackendAPIError && isAxiosError(err.originalError)) {
                if (err.originalError.response?.status === 401) {
                    setLoginAlertMsg({ message: 'Login Failed. Incorrect email and/or password', variant: 'danger' });
                    handled = true;
                } else if(err.originalError.response?.status === 403) {
                    setShowResendVerificationModal(true);
                    handled = true;
                }
            }
            if (!handled) {
                setLoginAlertMsg({ message: err.message, variant: 'danger' });
            }
        }
    };

    const handleSubmit = (event: any) => {
        console.log(event);
        const form = event.currentTarget;
        event.preventDefault();

        if (form.checkValidity() === false) {
            event.stopPropagation();
        } else {
            console.log(form);
            handleLogin();
        }

        setValidated(true);
    };

    useEffect(() => {
        const token = Cookie.get('sessionToken');
        console.log(token);
        if (token) {
            console.info('Already logged in, pushing to Courses.');
            // TODO: Check user type
            history.push('/common/courses');
        }
    });

    return (
        <>
            <ResendVerificationModal
                email={formState.email}
                showResendVerificationModal={showResendVerificationModal}
                setShowResendVerificationModal={setShowResendVerificationModal}
            />
            <Form noValidate validated={validated} onSubmit={handleSubmit} action='#'>
                <Form.Group controlId="institutionalEmail">
                    {(loginAlertMsg !== '') && <Alert variant={registrationAlertType}>{loginAlertMsg}</Alert>}
                    <Form.Label>Institutional Email Address</Form.Label>
                    <Form.Control
                        required
                        defaultValue=''
                        name="email"
                        autoComplete="username"
                        type="email"
                        placeholder="cxavier@xavierinstitute.edu"
                        onChange={handleNamedChange('email')}
                    />
                    <Form.Control.Feedback type="invalid">{<span>An Institutional is required.</span>}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group controlId="password">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                        required
                        defaultValue=''
                        name="password"
                        autoComplete="current-password"
                        type="password"
                        placeholder="******"
                        onChange={handleNamedChange('password')}
                    />
                    <Form.Control.Feedback type="invalid">{<span>A password is required.</span>}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group>
                    <Button type="submit">Submit</Button>
                </Form.Group>
            </Form>
            <Row>
                <Col className="text-center">
                    <ForgotPasswordButtonAndModal defaultEmail={formState.email} />
                </Col>
            </Row>
        </>
    );
};

export default LoginForm;