import { Grid, TextField, Button, CircularProgress, Box } from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { MuiPickersUtilsProvider, DateTimePicker } from '@material-ui/pickers';
import MomentUtils from '@date-io/moment';
import moment, { Moment } from 'moment';
import { extendQuestion, extendTopic, getQuestion, getTopic } from '../../APIInterfaces/BackendAPI/Requests/CourseRequests';
import _ from 'lodash';
import { TopicObject, ProblemObject } from '../CourseInterfaces';
import { Alert } from 'react-bootstrap';

interface OverridesFormProps {
    userId: number;
    topic?: TopicObject;
    problem?: ProblemObject;
}

type TopicExtensions = {
    startDate: Moment;
    endDate: Moment;
    deadDate?: Moment;
    maxGradedAttemptsPerVersion?: number;
    maxVersions?: number;
    versionDelay?: number;
    duration?: number;
}

type QuestionExtensions = {
    maxAttempts: number;
}

type Inputs = TopicExtensions & QuestionExtensions;


export const OverridesForm: React.FC<OverridesFormProps> = ({topic, userId, problem}) => {
    const formDefaultValues = {
        startDate: moment(),
        endDate: moment(),
        deadDate: moment(),
        maxAttempts: -1,
    };
    const { register, handleSubmit, getValues, errors, control, watch, formState, reset, setError } = useForm<Inputs>(
        {
            mode: 'onSubmit', 
            shouldFocusError: true,
            defaultValues: formDefaultValues
        }
    );
    const [formLoading, setFormLoading] = useState<boolean>(false);
    const drawerFontSize = '1.4em';
    const { startDate, endDate, deadDate } = watch();
    const [defaultTopic, setDefaultTopic] = useState<TopicObject | undefined>(topic);
    const [defaultProblem, setDefaultProblem] = useState<ProblemObject | undefined>(problem);
    const { isSubmitSuccessful, isSubmitting  } = formState;

    useEffect(()=>{
        setDefaultTopic(topic);
        setDefaultProblem(problem);
        reset();
    }, [topic, problem, userId]);

    // Get Topic Override information
    useEffect(()=>{
        if (!topic || problem !== undefined) return;
        setFormLoading(true);

        (async () => {
            try {
                const res = await getTopic({id: topic.id, userId});
                const topicData = res.data.data;
                // If there are overrides for the selected user, overwrite the default dates in the object.
                // Right now, we expect only one override per topic to be returned.
                if (topicData.studentTopicOverride?.length === 1) {
                    _.assign(topicData, topicData.studentTopicOverride[0]);
                }

                reset({
                    startDate: topicData.startDate?.toMoment(),
                    endDate: topicData.endDate?.toMoment(),
                    deadDate: topicData.deadDate?.toMoment(),    
                });
                setDefaultTopic(new TopicObject(topicData));
            } catch (e) {
                console.error(`Topic ${topic.id} or User ${userId} does not exist!`, e);
                setError('server', {
                    type: 'manual',
                    message: e.message,
                });
            } finally {
                setFormLoading(false);
            }
        })();
    }, [topic, userId]);

    // Get Question Override information
    useEffect(()=>{
        if (!problem) return;

        (async () => {
            try {
                const res = await getQuestion({id: problem.id, userId});
                const questionData = res.data.data;

                // If there are overrides for the selected user, overwrite the default dates in the object.
                // Right now, we expect only one override per topic to be returned.
                if (questionData.studentTopicQuestionOverride?.length === 1) {
                    _.assign(questionData, questionData.studentTopicQuestionOverride[0]);
                }

                reset({
                    maxAttempts: questionData.maxAttempts
                });
                setDefaultProblem(new ProblemObject(questionData));
            } catch (e) {
                console.error(`Question ${problem.id} or User ${userId} does not exist!`, e);
                setError('server', {
                    type: 'manual',
                    message: e.message,
                });
            } finally {
                setFormLoading(false);
            }
        })();

    }, [problem, userId]);

    const updateTopic = async (courseTopicContentId: number, userId: number, inputs: TopicExtensions, topicAssessmentInfoId?: number) => {
        // TODO update state with response, there is currently a bug where coming back from a problem will show the original state of the page not with updates
        await extendTopic({
            courseTopicContentId,
            userId,
            topicAssessmentInfoId,
            data: {
                extensions: {
                    startDate: inputs.startDate,
                    endDate: inputs.endDate,
                    deadDate: inputs.deadDate,
                },
                studentTopicAssessmentOverride: {
                    duration: inputs.duration,
                    maxGradedAttemptsPerVersion: inputs.maxGradedAttemptsPerVersion,
                    maxVersions: inputs.maxVersions,
                    versionDelay: inputs.versionDelay,
                }
            }
        });
    };

    const updateQuestions = async (courseTopicQuestionId: number, userId: number, extensions: QuestionExtensions) => {
        await extendQuestion({courseTopicQuestionId, userId, extensions});
    };

    const onSubmit = async (extensions: TopicExtensions | QuestionExtensions) => {
        try {
            if (problem) {
                await updateQuestions(problem.id, userId, extensions as QuestionExtensions);
            } else if (topic) {
                await updateTopic(topic.id, userId, extensions as TopicExtensions, defaultTopic?.topicAssessmentInfo?.id);
            } else {
                console.error('Unhandled override case.');
            }
        } catch (e) {
            setError('server', {
                type: 'manual',
                message: e.message,
            });
        }
    };

    const renderQuestionOverrideForm = (question: ProblemObject) => (
        <Grid item container md={12} alignItems='flex-start' justify="center">
            <Grid item md={4}>
                <TextField 
                    name="maxAttempts" 
                    inputRef={register({
                        required: true, 
                        min: -1
                    })}
                    defaultValue={question.maxAttempts} 
                    label='Max Attempts'
                    type='number'
                />
            </Grid>
        </Grid>
    );

    const renderNormalTopicOverrideForm = (topic: TopicObject) => (
        <>
            <Grid item md={12}>
                <MuiPickersUtilsProvider utils={MomentUtils}>
                    <Controller
                        as={<DateTimePicker value="" onChange={() => {}} />}
                        name="startDate"
                        control={control}
                        defaultValue={moment(topic.startDate)}
                        autoOk
                        variant="inline"
                        fullWidth={true}
                        label='Start Date'
                        InputLabelProps={{style: { color: 'rgba(255, 255, 255, 0.8)', fontSize: drawerFontSize }}}
                        inputProps={{ style: { textAlign: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: drawerFontSize } }}
                        maxDate={endDate || moment(topic.endDate)}
                        rules={{
                            required: true,
                            validate: {
                                isDate: (data: any) => moment(data).isValid() || 'Invalid date',
                                isEarliest: (startDate: Moment) => {
                                    const { endDate, deadDate } = getValues();
                                    return startDate.isSameOrBefore(endDate) && startDate.isSameOrBefore(deadDate) || topic.topicTypeId === 2 || 'Start date cannot be after End or Dead dates';
                                }
                            }
                        }}
                    />
                </MuiPickersUtilsProvider>
            </Grid>

            <Grid item md={12}>
                <MuiPickersUtilsProvider utils={MomentUtils}>
                    <Controller
                        as={<DateTimePicker value="" onChange={() => {}} />}
                        name="endDate"
                        control={control}
                        defaultValue={moment(topic.endDate)}
                        autoOk
                        variant="inline"
                        fullWidth={true}
                        label='End Date'
                        InputLabelProps={{style: { color: 'rgba(255, 255, 255, 0.8)', fontSize: drawerFontSize }}}
                        inputProps={{ style: { textAlign: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: drawerFontSize } }}
                        minDate={startDate || moment(topic.startDate)}
                        maxDate={topic.topicTypeId === 1 ? (deadDate || moment(topic.deadDate)) : undefined}
                        rules={{
                            required: true,
                            validate: {
                                isDate: (data: any) => moment(data).isValid() || 'Invalid date',
                            }
                        }}
                    />
                </MuiPickersUtilsProvider>
            </Grid>

            {
                topic.topicTypeId === 1 &&
                <Grid item md={12}>
                    <MuiPickersUtilsProvider utils={MomentUtils}>
                        <Controller
                            as={<DateTimePicker value="" onChange={() => {}} />}
                            name="deadDate"
                            control={control}
                            defaultValue={moment(topic.deadDate)}
                            autoOk
                            variant="inline"
                            fullWidth={true}
                            label='Dead Date'
                            InputLabelProps={{style: { color: 'rgba(255, 255, 255, 0.8)', fontSize: drawerFontSize }}}
                            inputProps={{ style: { textAlign: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: drawerFontSize } }}
                            minDate={endDate || moment(topic.endDate)}
                        />
                    </MuiPickersUtilsProvider>
                </Grid>
            }
        </>
    );

    const renderAssessmentTopicOverrideForm = (topic: TopicObject) => {
        const { topicAssessmentInfo } = topic;
        // Defensive code, should have already been checked
        if (_.isNil(topicAssessmentInfo)) {
            return null;
        }

        const md = 12;

        return (
            <>
                <Grid item md={md}>
                    <TextField 
                        name="maxGradedAttemptsPerVersion" 
                        inputRef={register({
                            required: true, 
                            min: -1
                        })}
                        defaultValue={topicAssessmentInfo.maxGradedAttemptsPerVersion} 
                        label='Max Graded Attempts Per Version'
                        type='number'
                        fullWidth={true}
                    />
                </Grid>
                <Grid item md={md}>
                    <TextField 
                        name="maxVersions" 
                        inputRef={register({
                            required: true, 
                            min: -1
                        })}
                        defaultValue={topicAssessmentInfo.maxVersions} 
                        label='Max Versions'
                        type='number'
                        fullWidth={true}
                    />
                </Grid>
                <Grid item md={md}>
                    <TextField 
                        name="versionDelay" 
                        inputRef={register({
                            required: true, 
                            min: 0 // TODO what should we make the min
                        })}
                        defaultValue={topicAssessmentInfo.versionDelay} 
                        label='Version Delay'
                        type='number'
                        fullWidth={true}
                    />
                </Grid>
                <Grid item md={md}>
                    <TextField 
                        name="duration" 
                        inputRef={register({
                            required: true, 
                            min: 0 // TODO what should we make the min
                        })}
                        defaultValue={topicAssessmentInfo.duration} 
                        label='Duration'
                        type='number'
                        fullWidth={true}
                    />
                </Grid>
            </>
        );
    };

    const renderTopicOverrideForm = (topic: TopicObject) => {
        const md = _.isNil(topic.topicAssessmentInfo) ? 12 : 6;
        return (
            <>
                <Grid md={md} item spacing={1}>
                    {renderNormalTopicOverrideForm(topic)}                
                </Grid>
                {
                    _.isNil(topic.topicAssessmentInfo) === false &&
                    <Grid md={md} item spacing={1}>
                        {renderAssessmentTopicOverrideForm(topic)}            
                    </Grid>
                }
            </>
        );
    };
  
    return (
        <form onSubmit={handleSubmit(onSubmit)} style={{width: '100%', marginTop: '1.5rem'}}>
            <Grid container justify='center'>
                <Grid container item md={6} spacing={2}>
                    <Grid item md={12}>
                        {isSubmitSuccessful && <Alert variant='success'>Successfully updated</Alert>}
                        {_.values(errors).map(data => <Alert variant='danger' key={(data as any)?.type}>{(data as any)?.message || 'Please enter an appropriate value'}</Alert>)}
                    </Grid>

                    {/* TODO: Use AnimatePresence for a better UX than the flicker or delay. */}
                    {formLoading ? (
                        <CircularProgress />
                    ) : (
                        <>
                            {defaultProblem ? 
                                renderQuestionOverrideForm(defaultProblem) :
                                (defaultTopic && renderTopicOverrideForm(defaultTopic))
                            }
                        </>
                    )
                    }
            
                    <Grid container item md={12} alignItems='flex-start' justify="flex-end" >
                        <Grid item>
                            {isSubmitting ? 
                                (<Button 
                                    variant="contained" 
                                    color='secondary'
                                    style={{fontSize: '1.2em'}}
                                    disabled={true}
                                >
                                    Submitting...
                                </Button>) :
                                (<Button 
                                    variant="contained" 
                                    color='primary' 
                                    type="submit" 
                                    style={{fontSize: '1.2em'}}
                                    disabled={formLoading}
                                >
                                    Confirm Extension
                                </Button>)
                            }
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </form>
    );
};

export default OverridesForm;