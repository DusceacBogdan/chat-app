import ChatInput from '@/components/ChatInput';
import Messages from '@/components/Messages';
import { fetchRedis } from '@/helpers/redis';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { messageArrayValidator } from '@/lib/validations/message';
import { getServerSession } from 'next-auth';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { FC } from 'react';

interface pageProps {
    params: {
        chatId: string;
    };
}

async function getChatMessages(chatId: string) {
    try {
        const results: string[] = await fetchRedis('zrange', `chat:${chatId}:messages`, 0, -1);

        const dbMessages = results.map((message) => JSON.parse(message) as Message);

        const reversedDbMessages = dbMessages.reverse();

        const messages = messageArrayValidator.parse(reversedDbMessages) as Message[];

        return messages;
    } catch (error) {
        notFound();
    }
}

const page: FC<pageProps> = async ({ params }: pageProps) => {
    const { chatId } = params;
    const session = await getServerSession(authOptions);
    if (!session) notFound();

    const { user } = session;

    const [userId1, userId2] = chatId.split('--');

    if (user.id !== userId1 && user.id !== userId2) notFound();
    const chatPartnerId = user.id === userId1 ? userId2 : userId1;
    const chatPartnerNotParsed = (await fetchRedis('get', `user:${chatPartnerId}`)) as string;
    const chatPartner = JSON.parse(chatPartnerNotParsed) as User;
    console.log(chatPartner.image);
    // const chatPartner = (await db.get(`user:${chatPartnerId}`)) as User
    const initialMessages = await getChatMessages(chatId);
    return (
        <div className='flex h-full max-h-[calc(100vh-6rem)] flex-1 flex-col justify-between'>
            <div className='flex justify-between border-b-2 border-gray-200 py-3 sm:items-center'>
                <div className='relative flex items-center space-x-4'>
                    <div className='relative'>
                        <div className='relative h-8 w-8 sm:h-12 sm:w-12'>
                            <Image
                                fill
                                referrerPolicy='no-referrer'
                                src={chatPartner.image}
                                alt={`${chatPartner.name}'s profile picture`}
                                className='rounded-full'
                            />
                        </div>
                    </div>
                    <div className='flex flex-col leading-tight'>
                        <div className='flex items-center text-xl'>
                            <span className='mr-3 font-semibold text-gray-700'>{chatPartner.name}</span>
                        </div>
                        <span className='text-sm text-gray-600'>{chatPartner.email}</span>
                    </div>
                </div>
            </div>
            <Messages
                initialMessages={initialMessages}
                sessionId={session.user.id}
                chatId={chatId}
                chatPartner={chatPartner}
                sessionImg={session.user.image}
            />
            <ChatInput
                chatId={chatId}
                chatPartner={chatPartner}
            />
        </div>
    );
};

export default page;
